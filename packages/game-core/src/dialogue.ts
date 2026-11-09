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
};
