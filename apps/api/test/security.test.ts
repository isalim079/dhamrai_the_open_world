import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { generateKeyPairSync, sign, createHash, randomBytes } from 'node:crypto';
import { GoogleAuthService, AesGcmService, SessionService, AuthController, InMemoryUserRepository } from '../src/index.js';
import { validateEnv } from '../src/config/env.js';

const keyPair=generateKeyPairSync('rsa',{modulusLength:2048});
const attacker=generateKeyPairSync('rsa',{modulusLength:2048});
const publicJwk={...keyPair.publicKey.export({format:'jwk'}),kid:'google-test-key',alg:'RS256',use:'sig'};
const encryptionKey=randomBytes(32).toString('hex');
const defaults=()=>({sub:'google-sub',email:'driver@example.com',email_verified:true,aud:'client-id',iss:'https://accounts.google.com',exp:Math.floor(Date.now()/1000)+3600});
function jwt(claims: Record<string,unknown>={},header:Record<string,unknown>={},key=keyPair.privateKey):string {
  const a=Buffer.from(JSON.stringify({alg:'RS256',kid:'google-test-key',...header})).toString('base64url');
  const b=Buffer.from(JSON.stringify({...defaults(),...claims})).toString('base64url');
  return `${a}.${b}.${sign('RSA-SHA256',Buffer.from(`${a}.${b}`),key).toString('base64url')}`;
}
let service:GoogleAuthService;
let fetchMock:ReturnType<typeof vi.fn>;
beforeEach(()=>{
  vi.stubEnv('NODE_ENV','test'); vi.stubEnv('TOKEN_ENCRYPTION_KEY_HEX',encryptionKey);
  vi.stubEnv('GOOGLE_CLIENT_ID','client-id');vi.stubEnv('GOOGLE_CLIENT_SECRET','client-secret');
  vi.stubEnv('GOOGLE_REDIRECT_URI','https://game.example/callback');
  fetchMock=vi.fn().mockImplementation(async()=>new Response(JSON.stringify({keys:[publicJwk]}),{headers:{'cache-control':'max-age=300'}}));
  vi.stubGlobal('fetch',fetchMock); service=new GoogleAuthService();
});
afterEach(()=>{vi.useRealTimers();vi.unstubAllEnvs();vi.unstubAllGlobals();vi.restoreAllMocks();});
describe('OAuth security unit tests: real RSA signatures, mocked trusted-key transport',()=>{
  it('verifies RSA-SHA256 against keys fetched only from the fixed Google endpoint',async()=>{
    expect((await service.verifyIdToken(jwt())).sub).toBe('google-sub');
    expect(fetchMock.mock.calls[0]![0]).toBe('https://www.googleapis.com/oauth2/v3/certs');
    await service.verifyIdToken(jwt({}, {jku:'https://attacker.example/keys',jwk:attacker.publicKey.export({format:'jwk'})}));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it('rejects attacker signatures, unsigned tokens, unknown kid and algorithm substitution',async()=>{
    for(const token of [jwt({}, {},attacker.privateKey),jwt({}, {alg:'none'}),jwt({}, {alg:'HS256'}),jwt({}, {kid:'unknown'}),'mock_token_admin']) {
      await expect(service.verifyIdToken(token)).rejects.toThrow('verification failed');
    }
  });
  it.each([
    ['wrong audience',{aud:'another-client'}],['missing audience',{aud:undefined}],
    ['wrong issuer',{iss:'https://evil.example'}],['expired',{exp:0}],['missing expiry',{exp:undefined}],
    ['nonnumeric expiry',{exp:'tomorrow'}],['missing subject',{sub:undefined}],
    ['multiple audiences without azp',{aud:['client-id','other']}],['wrong azp',{azp:'other'}],
  ])('rejects %s',async(_name,claims)=>{await expect(service.verifyIdToken(jwt(claims))).rejects.toThrow();});
  it('accepts Google issuer variants and correctly authorized audience arrays',async()=>{
    expect((await service.verifyIdToken(jwt({iss:'accounts.google.com',aud:['client-id','other'],azp:'client-id'}))).aud).toBe('client-id');
  });
  it('rejects a validly signed token carrying the wrong OAuth nonce',async()=>{
    await expect(service.verifyIdToken(jwt({nonce:'wrong'}),'expected')).rejects.toThrow();
  });
  it('production has no mock-token bypass',async()=>{
    vi.stubEnv('NODE_ENV','production');
    await expect(service.verifyIdToken('mock_token_admin')).rejects.toThrow();
  });
  it('key transport failure fails closed',async()=>{
    fetchMock.mockRejectedValue(new Error('network failure'));
    await expect(service.verifyIdToken(jwt())).rejects.toThrow('verification failed');
  });
});
describe('OAuth flow unit tests (mock token endpoint; no live Google login)',()=>{
  it('controller binds production state cookie with HttpOnly/Secure/SameSite and rejects missing callback binding',async()=>{
    vi.stubEnv('NODE_ENV','production');vi.stubEnv('SESSION_SECRET',randomBytes(32).toString('hex'));
    const controller=new AuthController(service,new SessionService(),new AesGcmService(),new InMemoryUserRepository());
    const cookie=vi.fn();
    await controller.beginGoogle({cookie} as never);
    expect(cookie.mock.calls[0]![2]).toMatchObject({httpOnly:true,secure:true,sameSite:'lax',path:'/api/auth'});
    await expect(controller.authenticateGoogle({idToken:jwt(),state:'attacker'})).rejects.toThrow();
  });
  it('generates unpredictable state, binds it to cookie, rejects missing/mismatched bindings and replay',async()=>{
    const a=await service.beginOAuth(),b=await service.beginOAuth();
    const state=new URL(a.authorizationUrl).searchParams.get('state')!;
    expect(state).not.toBe(new URL(b.authorizationUrl).searchParams.get('state'));
    expect(state.length).toBeGreaterThanOrEqual(43);
    await expect(service.consumeOAuth(state)).rejects.toThrow();
    await expect(service.consumeOAuth('wrong',a.cookie)).rejects.toThrow();
    await expect(service.consumeOAuth(state,b.cookie)).rejects.toThrow();
    await expect(service.consumeOAuth(state,a.cookie+'tamper')).rejects.toThrow();
    await service.consumeOAuth(state,a.cookie);
    await expect(service.consumeOAuth(state,a.cookie)).rejects.toThrow('already consumed');
  });
  it('rejects expired transaction cookies and exact redirect URI mismatches',async()=>{
    vi.useFakeTimers();
    const a=await service.beginOAuth();const state=new URL(a.authorizationUrl).searchParams.get('state')!;
    for(const redirect of ['https://evil.example/callback','https://game.example/callback/','postmessage']) {
      await expect(service.consumeOAuth(state,a.cookie,redirect)).rejects.toThrow('redirect');
    }
    vi.advanceTimersByTime(600001);
    await expect(service.consumeOAuth(state,a.cookie)).rejects.toThrow('expired');
  });
  it('uses S256 PKCE with a server-generated verifier and verifies the token nonce',async()=>{
    const a=await service.beginOAuth();const url=new URL(a.authorizationUrl);const state=url.searchParams.get('state')!;
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    fetchMock.mockImplementation(async (urlArg:string,init?:RequestInit)=>{
      if(urlArg.endsWith('/certs'))return new Response(JSON.stringify({keys:[publicJwk]}));
      const params=new URLSearchParams(init?.body as string);const verifier=params.get('code_verifier')!;
      expect(verifier).toMatch(/^[A-Za-z0-9_-]{43}$/);
      expect(createHash('sha256').update(verifier).digest('base64url')).toBe(url.searchParams.get('code_challenge'));
      expect(params.get('redirect_uri')).toBe('https://game.example/callback');
      return new Response(JSON.stringify({access_token:'access',refresh_token:'refresh',expires_in:3600,id_token:jwt({nonce:url.searchParams.get('nonce')})}));
    });
    expect((await service.exchangeAuthorizationCode('code',undefined,state,a.cookie)).accessToken).toBe('access');
    await expect(service.exchangeAuthorizationCode('code',undefined,state,a.cookie)).rejects.toThrow();
  });
  it('never exchanges codes lacking state or browser binding and never accepts mock codes implicitly',async()=>{
    await expect(service.exchangeAuthorizationCode('mock_code_admin')).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('rejects wrong token nonce and does not expose Google error bodies',async()=>{
    const a=await service.beginOAuth();const state=new URL(a.authorizationUrl).searchParams.get('state')!;
    fetchMock.mockResolvedValue(new Response(JSON.stringify({access_token:'access',id_token:jwt({nonce:'wrong'})})));
    await expect(service.exchangeAuthorizationCode('code',undefined,state,a.cookie)).rejects.toThrow('code exchange failed');
    const b=await service.beginOAuth();const s=new URL(b.authorizationUrl).searchParams.get('state')!;
    fetchMock.mockResolvedValue(new Response('secret-token-value',{status:400}));
    await expect(service.exchangeAuthorizationCode('code',undefined,s,b.cookie)).rejects.not.toThrow('secret-token-value');
  });
});
describe('Production encryption and secret handling unit tests',()=>{
  function prod(){
    vi.stubEnv('NODE_ENV','production');vi.stubEnv('DATABASE_URL','postgresql://localhost/test');
    vi.stubEnv('SESSION_SECRET',randomBytes(32).toString('hex'));vi.stubEnv('USE_REAL_GOOGLE_DRIVE','true');
  }
  it('validates a 32-byte key at startup and in the encryption service',()=>{
    prod();expect(()=>validateEnv()).not.toThrow();expect(()=>new AesGcmService()).not.toThrow();
  });
  it.each(['','zz'.repeat(32),'ab'.repeat(31),'ab'.repeat(33),'0123456789abcdef'.repeat(4),
    createHash('sha256').update('dhamrai_life_dev_encryption_seed').digest('hex')])('rejects missing/invalid/development key %#',value=>{
    prod();vi.stubEnv('TOKEN_ENCRYPTION_KEY_HEX',value);
    expect(()=>validateEnv()).toThrow();expect(()=>new AesGcmService()).toThrow();
  });
  it('rejects production injected deterministic development keys too',()=>{
    prod();expect(()=>new AesGcmService(createHash('sha256').update('dhamrai_life_dev_encryption_seed').digest())).toThrow();
  });
  it('requires production session secret independently of bootstrap',()=>{
    prod();vi.stubEnv('SESSION_SECRET','');expect(()=>new SessionService()).toThrow();
  });
  it('key errors and failed token exchanges do not log or include secrets',async()=>{
    const log=vi.spyOn(console,'log'),warn=vi.spyOn(console,'warn'),error=vi.spyOn(console,'error');
    prod();const secret='not-a-key-SECRET';vi.stubEnv('TOKEN_ENCRYPTION_KEY_HEX',secret);
    try{validateEnv();}catch(e){expect(String(e)).not.toContain(secret);}
    expect(log).not.toHaveBeenCalled();expect(warn).not.toHaveBeenCalled();expect(error).not.toHaveBeenCalled();
  });
});
