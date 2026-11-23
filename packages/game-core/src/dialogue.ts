/**
 * Dhamrai Life — Declarative Dialogue Trees
 * ==========================================
 * Authentic bilingual (Bengali + English) dialogue definitions
 * driving character interactions, quest-giving, and story progression.
 */

import { DialogueTree } from '@dhamrai/shared-contracts';

export const PHASE_1_DIALOGUE_TREES: Record<string, DialogueTree> = {
  dialogue_farhana_student: {
    id: 'dialogue_farhana_student',
    initialNodeId: 'node_intro',
    nodes: {
      node_intro: {
        id: 'node_intro',
        speakerId: 'npc_student_farhana',
        speakerNameBn: 'ফারহানা (ছাত্রী)',
        speakerNameEn: 'Farhana (Student)',
        textBn: 'ভাইয়া, হার্ডিঞ্জ স্কুল গেটে যাবেন? ক্লাস শুরু হয়ে যাবে, একটু তাড়া আছে!',
        textEn: 'Brother, will you go to Hardinge School Gate? Class is about to start, I am in a hurry!',
        choices: [
          {
            id: 'choice_accept_fare',
            textBn: 'হ্যাঁ চলুন, রিকশায় উঠুন। ভাড়া ৩০ টাকা।',
            textEn: 'Yes let\'s go, please board the rickshaw. Fare is ৳30.',
            nextNodeId: 'node_accepted',
            actionTrigger: 'BOARD_PASSENGER',
          },
          {
            id: 'choice_decline',
            textBn: 'এখন যেতে পারছি না বোন, অন্য রিকশা দেখুন।',
            textEn: 'I cannot go right now sister, please find another rickshaw.',
            nextNodeId: 'node_declined',
            actionTrigger: 'CLOSE_DIALOGUE',
          },
        ],
      },
      node_accepted: {
        id: 'node_accepted',
        speakerId: 'npc_student_farhana',
        speakerNameBn: 'ফারহানা (ছাত্রী)',
        speakerNameEn: 'Farhana (Student)',
        textBn: 'ধন্যবাদ ভাইয়া! সাবধানে চালাবেন, রাস্তার মোড়ে ভিড় থাকে।',
        textEn: 'Thank you brother! Please drive safely, the town junction is crowded.',
      },
      node_declined: {
        id: 'node_declined',
        speakerId: 'npc_student_farhana',
        speakerNameBn: 'ফারহানা (ছাত্রী)',
        speakerNameEn: 'Farhana (Student)',
        textBn: 'আচ্ছা ঠিক আছে ভাইয়া, দেখি অন্য কাউকে পাই কিনা।',
        textEn: 'Alright brother, let me see if I can find someone else.',
      },
      node_arrived: {
        id: 'node_arrived',
        speakerId: 'npc_student_farhana',
        speakerNameBn: 'ফারহানা (ছাত্রী)',
        speakerNameEn: 'Farhana (Student)',
        textBn: 'এই তো এসে গেছি! এই নিন আপনার ভাড়া ৩০ টাকা। অনেক ধন্যবাদ ভাইয়া!',
        textEn: 'Here we are! Here is your fare ৳30. Thank you very much brother!',
      },
    },
  },

  dialogue_police_rafiq: {
    id: 'dialogue_police_rafiq',
    initialNodeId: 'node_checkpoint_greet',
    nodes: {
      node_checkpoint_greet: {
        id: 'node_checkpoint_greet',
        speakerId: 'npc_police_rafiq',
        speakerNameBn: 'এসআই রফিক (থানা পুলিশ)',
        speakerNameEn: 'SI Rafiq (Police Patrol)',
        textBn: 'রিকশাচালক ভাই, থানা মোড় চেকপোস্টে একটু থামুন। পৌরসভার লাইসেন্স কাগজটা সঙ্গে আছে তো?',
        textEn: 'Driver brother, please halt at the Thana checkpoint. Do you have your municipality license slip with you?',
        choices: [
          {
            id: 'choice_show_slip',
            textBn: 'জি স্যার, এই যে রিকশার বৈধ রেজিস্ট্রেশন কাগজ।',
            textEn: 'Yes sir, here is the valid rickshaw registration slip from my pocket.',
            nextNodeId: 'node_slip_verified',
            actionTrigger: 'INSPECT_DOCUMENTS',
          },
          {
            id: 'choice_ask_delay',
            textBn: 'একটু জরুরি কাজে যাচ্ছি স্যার, ছাড়া যাবে?',
            textEn: 'I am on an urgent trip sir, may I proceed?',
            nextNodeId: 'node_strict_warning',
          },
        ],
      },
      node_slip_verified: {
        id: 'node_slip_verified',
        speakerId: 'npc_police_rafiq',
        speakerNameBn: 'এসআই রফিক (থানা পুলিশ)',
        speakerNameEn: 'SI Rafiq (Police Patrol)',
        textBn: 'কাগজপত্র সব ঠিক আছে। ট্রাফিক নিয়ম মেনে রিকশা চালাবেন। সাবধানে যান।',
        textEn: 'Documents are all in order. Follow traffic rules and drive safely.',
      },
      node_strict_warning: {
        id: 'node_strict_warning',
        speakerId: 'npc_police_rafiq',
        speakerNameBn: 'এসআই রফিক (থানা পুলিশ)',
        speakerNameEn: 'SI Rafiq (Police Patrol)',
        textBn: 'কাগজ ছাড়া ছাড়া যাবে না। ইনভেন্টরি থেকে রেজিস্ট্রেশন কাগজ দেখান।',
        textEn: 'You cannot proceed without inspection. Please show your registration slip from your inventory.',
      },
    },
  },

  dialogue_artisan_gouranga: {
    id: 'dialogue_artisan_gouranga',
    initialNodeId: 'node_artisan_greet',
    nodes: {
      node_artisan_greet: {
        id: 'node_artisan_greet',
        speakerId: 'npc_artisan_gouranga',
        speakerNameBn: 'গৌরাঙ্গ কর্মকার (কাঁসা কারিগর)',
        speakerNameEn: 'Gouranga Karmakar (Brass Artisan)',
        textBn: 'নমস্কার ভাই! ধামরাইয়ের কাঁসা-পিতলের কাজ দুইশত বছরের ঐতিহ্য। নতুন পিতলের ঘণ্টিগুলোর চালান রথখোলায় পৌঁছে দেবেন?',
        textEn: 'Greetings brother! Dhamrai metalcraft carries a two-century heritage. Will you transport the newly cast brass bells consignment to Rathkhola?',
        choices: [
          {
            id: 'choice_accept_craft',
            textBn: 'অবশ্যই দাদা, সাবধানে মালামাল পৌঁছে দেব। ভাড়া কত?',
            textEn: 'Certainly uncle, I will deliver the goods safely. What is the fare?',
            nextNodeId: 'node_craft_fare',
            actionTrigger: 'PICKUP_CARGO',
          },
          {
            id: 'choice_decline_craft',
            textBn: 'এখন ভারি মালামাল টানতে পারব না দাদা।',
            textEn: 'I cannot haul heavy cargo right now uncle.',
            nextNodeId: 'node_craft_declined',
            actionTrigger: 'CLOSE_DIALOGUE',
          },
        ],
      },
      node_craft_fare: {
        id: 'node_craft_fare',
        speakerId: 'npc_artisan_gouranga',
        speakerNameBn: 'গৌরাঙ্গ কর্মকার (কাঁসা কারিগর)',
        speakerNameEn: 'Gouranga Karmakar (Brass Artisan)',
        textBn: 'মাল ঠিকমতো খালাস করলে নগদ ৭৫ টাকা পাবেন। সাবধানে নিয়ে যাবেন!',
        textEn: 'Deliver the cargo intact and you will earn ৳75 cash. Handle with care!',
      },
      node_craft_declined: {
        id: 'node_craft_declined',
        speakerId: 'npc_artisan_gouranga',
        speakerNameBn: 'গৌরাঙ্গ কর্মকার (কাঁসা কারিগর)',
        speakerNameEn: 'Gouranga Karmakar (Brass Artisan)',
        textBn: 'ঠিক আছে ভাই, অন্য কোনো মালবাহী রিকশা ডাকি।',
        textEn: 'Alright brother, let me call another cargo rickshaw.',
      },
    },
  },

  dialogue_fare_kamal: {
    id: 'dialogue_fare_kamal',
    initialNodeId: 'node_intro',
    nodes: {
      node_intro: {
        id: 'node_intro',
        speakerId: 'npc_passenger_kamal',
        speakerNameBn: 'কামাল মিয়া (যাত্রী)',
        speakerNameEn: 'Kamal Mia (Passenger)',
        textBn: 'ভাই, থানা মোড়ে যাবেন? জরুরি কাজ আছে, একটু জলদি চলুন।',
        textEn: 'Brother, will you go to Thana Junction? I have urgent business, please make it quick.',
        choices: [
          {
            id: 'choice_accept_fare',
            textBn: 'হ্যাঁ চলুন, রিকশায় উঠুন।',
            textEn: 'Yes let\'s go, please board the rickshaw.',
            nextNodeId: 'node_accepted',
            actionTrigger: 'START_FARE',
          },
          {
            id: 'choice_decline',
            textBn: 'এখন যেতে পারছি না ভাই, অন্য রিকশা দেখুন।',
            textEn: 'Cannot go right now brother, please find another rickshaw.',
            nextNodeId: 'node_declined',
            actionTrigger: 'CLOSE_DIALOGUE',
          },
        ],
      },
      node_accepted: {
        id: 'node_accepted',
        speakerId: 'npc_passenger_kamal',
        speakerNameBn: 'কামাল মিয়া (যাত্রী)',
        speakerNameEn: 'Kamal Mia (Passenger)',
        textBn: 'ধন্যবাদ ভাই! সাবধানে নিয়ে যান।',
        textEn: 'Thank you brother! Take me there safely.',
      },
      node_declined: {
        id: 'node_declined',
        speakerId: 'npc_passenger_kamal',
        speakerNameBn: 'কামাল মিয়া (যাত্রী)',
        speakerNameEn: 'Kamal Mia (Passenger)',
        textBn: 'আচ্ছা ভাই, অন্য রিকশা দেখছি।',
        textEn: 'Alright brother, let me see if I can find another rickshaw.',
      },
      node_arrived: {
        id: 'node_arrived',
        speakerId: 'npc_passenger_kamal',
        speakerNameBn: 'কামাল মিয়া (যাত্রী)',
        speakerNameEn: 'Kamal Mia (Passenger)',
        textBn: 'এই তো থানা মোড় এসে গেছে! অনেক ধন্যবাদ ভাই, এই নিন আপনার ভাড়া।',
        textEn: 'Here is Thana Junction! Thank you very much brother, here is your fare.',
      },
    },
  },

  dialogue_fare_sufia: {
    id: 'dialogue_fare_sufia',
    initialNodeId: 'node_intro',
    nodes: {
      node_intro: {
        id: 'node_intro',
        speakerId: 'npc_passenger_sufia',
        speakerNameBn: 'সুফিয়া বেগম (যাত্রী)',
        speakerNameEn: 'Sufia Begum (Passenger)',
        textBn: 'রিকশাওয়ালা ভাই, কায়েতপাড়া মোড়ে যাবেন? বাজারে কেনাকাটা আছে।',
        textEn: 'Rickshaw driver brother, will you go to Kayetpara? I have market shopping.',
        choices: [
          {
            id: 'choice_accept_fare',
            textBn: 'হ্যাঁ খালাম্মা চলুন, সাবধানে তুলে দিচ্ছি।',
            textEn: 'Yes auntie let\'s go, please board safely.',
            nextNodeId: 'node_accepted',
            actionTrigger: 'START_FARE',
          },
          {
            id: 'choice_decline',
            textBn: 'এখন অন্যদিকে যাচ্ছি খালাম্মা।',
            textEn: 'Going another way right now, auntie.',
            nextNodeId: 'node_declined',
            actionTrigger: 'CLOSE_DIALOGUE',
          },
        ],
      },
      node_accepted: {
        id: 'node_accepted',
        speakerId: 'npc_passenger_sufia',
        speakerNameBn: 'সুফিয়া বেগম (যাত্রী)',
        speakerNameEn: 'Sufia Begum (Passenger)',
        textBn: 'অনেক ধন্যবাদ বাবা! একটু আস্তে চালান।',
        textEn: 'Thank you my boy! Drive smoothly.',
      },
      node_declined: {
        id: 'node_declined',
        speakerId: 'npc_passenger_sufia',
        speakerNameBn: 'সুফিয়া বেগম (যাত্রী)',
        speakerNameEn: 'Sufia Begum (Passenger)',
        textBn: 'ঠিক আছে বাবা, অন্য রিকশা দেখছি।',
        textEn: 'Alright my boy, looking for another rickshaw.',
      },
      node_arrived: {
        id: 'node_arrived',
        speakerId: 'npc_passenger_sufia',
        speakerNameBn: 'সুফিয়া বেগম (যাত্রী)',
        speakerNameEn: 'Sufia Begum (Passenger)',
        textBn: 'কায়েতপাড়া পৌঁছে গেছি। এই নিন আপনার ভাড়া বাবা। অনেক দোয়া রইল।',
        textEn: 'Reached Kayetpara. Here is your fare my boy, blessings to you.',
      },
    },
  },

  /** Milestone 13 — Rathkhola tea stall vendor */
  dialogue_tea_stall: {
    id: 'dialogue_tea_stall',
    initialNodeId: 'node_menu',
    nodes: {
      node_menu: {
        id: 'node_menu',
        speakerId: 'npc_tea_vendor',
        speakerNameBn: 'চাওয়ালা (রথখোলা)',
        speakerNameEn: 'Tea Vendor (Rathkhola)',
        textBn: 'কী নেবেন ভাই? গরম চা না বিস্কুট?',
        textEn: 'What will you take, brother? Hot cha or biscuits?',
        choices: [
          {
            id: 'choice_buy_cha',
            textBn: 'চা — ৳৫ (শক্তি +৩৫)',
            textEn: 'Cha — ৳5 (+35 stamina)',
            nextNodeId: 'node_thanks',
            actionTrigger: 'BUY_CHA',
          },
          {
            id: 'choice_buy_biscuits',
            textBn: 'বিস্কুট — ৳৮ (শক্তি +২০)',
            textEn: 'Biscuits — ৳8 (+20 stamina)',
            nextNodeId: 'node_thanks',
            actionTrigger: 'BUY_BISCUITS',
          },
          {
            id: 'choice_leave_stall',
            textBn: 'এখন না, পরে আসব।',
            textEn: 'Not now, I will come later.',
            actionTrigger: 'CLOSE_DIALOGUE',
          },
        ],
      },
      node_thanks: {
        id: 'node_thanks',
        speakerId: 'npc_tea_vendor',
        speakerNameBn: 'চাওয়ালা (রথখোলা)',
        speakerNameEn: 'Tea Vendor (Rathkhola)',
        textBn: 'নিন ভাই, আস্তে খান। আবার আসবেন!',
        textEn: 'Here you go brother — come again!',
      },
      node_no_funds: {
        id: 'node_no_funds',
        speakerId: 'npc_tea_vendor',
        speakerNameBn: 'চাওয়ালা (রথখোলা)',
        speakerNameEn: 'Tea Vendor (Rathkhola)',
        textBn: 'ভাই, টাকা কম আছে মনে হয়। পরে আসুন।',
        textEn: 'Brother, seems you are short on cash. Come later.',
      },
    },
  },

  /** Milestone 13 — Mistri Gautom (fictional) repair menu at Rathkhola */
  dialogue_mistri_gautom: {
    id: 'dialogue_mistri_gautom',
    initialNodeId: 'node_menu',
    nodes: {
      node_menu: {
        id: 'node_menu',
        speakerId: 'npc_mistri_gautom',
        speakerNameBn: 'মিস্ত্রি গৌতম (রথখোলা)',
        speakerNameEn: 'Mistri Gautom (Rathkhola)',
        textBn: 'রিকশা ঠিক করতে এসেছ? কী সমস্যা বলো।',
        textEn: 'Came to fix the rickshaw? Tell me what is wrong.',
        choices: [
          {
            id: 'choice_tire',
            textBn: 'টায়ার পাম্প / পাংচার — ৳২০',
            textEn: 'Tire pump / puncture — ৳20',
            nextNodeId: 'node_done',
            actionTrigger: 'REPAIR_TIRE',
          },
          {
            id: 'choice_tune',
            textBn: 'টিউন-আপ (−২৫ ক্ষতি) — ৳৪০',
            textEn: 'Tune-up (−25 damage) — ৳40',
            nextNodeId: 'node_done',
            actionTrigger: 'REPAIR_TUNE_UP',
          },
          {
            id: 'choice_full',
            textBn: 'পূর্ণ সার্ভিস — ৳৭৫',
            textEn: 'Full service — ৳75',
            nextNodeId: 'node_done',
            actionTrigger: 'REPAIR_FULL',
          },
          {
            id: 'choice_leave_mistri',
            textBn: 'এখন না।',
            textEn: 'Not now.',
            actionTrigger: 'CLOSE_DIALOGUE',
          },
        ],
      },
      node_done: {
        id: 'node_done',
        speakerId: 'npc_mistri_gautom',
        speakerNameBn: 'মিস্ত্রি গৌতম (রথখোলা)',
        speakerNameEn: 'Mistri Gautom (Rathkhola)',
        textBn: 'হয়ে গেছে! সাবধানে চালাও।',
        textEn: 'Done! Drive carefully.',
      },
      node_no_funds: {
        id: 'node_no_funds',
        speakerId: 'npc_mistri_gautom',
        speakerNameBn: 'মিস্ত্রি গৌতম (রথখোলা)',
        speakerNameEn: 'Mistri Gautom (Rathkhola)',
        textBn: 'ভাই, টাকা যথেষ্ট নেই। পরে এসো।',
        textEn: 'Brother, not enough cash. Come back later.',
      },
    },
  },

  /** Milestone 13 — Kayetpara chain oil (minor repair at artisan) */
  dialogue_kayetpara_chain_oil: {
    id: 'dialogue_kayetpara_chain_oil',
    initialNodeId: 'node_offer',
    nodes: {
      node_offer: {
        id: 'node_offer',
        speakerId: 'npc_artisan_gouranga',
        speakerNameBn: 'গৌরাঙ্গ কর্মকার',
        speakerNameEn: 'Gouranga Karmakar',
        textBn: 'চেইনে তেল লাগাতে চাও? মাত্র ১৫ টাকা।',
        textEn: 'Want chain oil? Only ৳15.',
        choices: [
          {
            id: 'choice_oil',
            textBn: 'হ্যাঁ, তেল লাগান (−১০ ক্ষতি) — ৳১৫',
            textEn: 'Yes, oil the chain (−10 damage) — ৳15',
            nextNodeId: 'node_oiled',
            actionTrigger: 'REPAIR_CHAIN_OIL',
          },
          {
            id: 'choice_skip_oil',
            textBn: 'ধন্যবাদ, এখন না।',
            textEn: 'Thanks, not now.',
            actionTrigger: 'CLOSE_DIALOGUE',
          },
        ],
      },
      node_oiled: {
        id: 'node_oiled',
        speakerId: 'npc_artisan_gouranga',
        speakerNameBn: 'গৌরাঙ্গ কর্মকার',
        speakerNameEn: 'Gouranga Karmakar',
        textBn: 'চেইন মসৃণ হয়েছে। সাবধানে যাও।',
        textEn: 'Chain is smooth. Go carefully.',
      },
    },
  },

  /** Milestone 14 — traffic stop / fine payment */
  dialogue_police_stop: {
    id: 'dialogue_police_stop',
    initialNodeId: 'node_stop',
    nodes: {
      node_stop: {
        id: 'node_stop',
        speakerId: 'npc_police_rafiq',
        speakerNameBn: 'এসআই রফিক (থানা পুলিশ)',
        speakerNameEn: 'SI Rafiq (Police Patrol)',
        textBn: 'রিকশা থামান! ট্রাফিক নিয়ম ভাঙা হয়েছে। জরিমানা পরিশোধ করবেন, নাকি লাইসেন্স দেখাবেন?',
        textEn: 'Halt the rickshaw! Traffic rules broken. Will you pay the fine, or show your license?',
        choices: [
          {
            id: 'choice_pay_fine',
            textBn: 'জরিমানা পরিশোধ করি',
            textEn: 'Pay the fine',
            nextNodeId: 'node_paid',
            actionTrigger: 'PAY_FINE',
          },
          {
            id: 'choice_show_license',
            textBn: 'লাইসেন্স দেখাই (−৳১০)',
            textEn: 'Show license (−৳10)',
            nextNodeId: 'node_stop',
            actionTrigger: 'SHOW_LICENSE_STOP',
          },
          {
            id: 'choice_refuse',
            textBn: 'পরে দেখব (প্রত্যাখ্যান)',
            textEn: 'Not now (refuse)',
            nextNodeId: 'node_refused',
            actionTrigger: 'REFUSE_STOP',
          },
        ],
      },
      node_paid: {
        id: 'node_paid',
        speakerId: 'npc_police_rafiq',
        speakerNameBn: 'এসআই রফিক (থানা পুলিশ)',
        speakerNameEn: 'SI Rafiq (Police Patrol)',
        textBn: 'ঠিক আছে, জরিমানা নেওয়া হলো। এবার সাবধানে চালান।',
        textEn: 'Fine received. Drive carefully from now on.',
      },
      node_refused: {
        id: 'node_refused',
        speakerId: 'npc_police_rafiq',
        speakerNameBn: 'এসআই রফিক (থানা পুলিশ)',
        speakerNameEn: 'SI Rafiq (Police Patrol)',
        textBn: 'চলে যাবেন? থানা এলাকায় নজর থাকবে।',
        textEn: 'Leaving? We will be watching near the Thana.',
      },
      node_no_funds: {
        id: 'node_no_funds',
        speakerId: 'npc_police_rafiq',
        speakerNameBn: 'এসআই রফিক (থানা পুলিশ)',
        speakerNameEn: 'SI Rafiq (Police Patrol)',
        textBn: 'টাকা নেই? জরিমানা বাকি থাকল — হিট বাড়বে।',
        textEn: 'No cash? Fine remains unpaid — heat will rise.',
      },
    },
  },
};
