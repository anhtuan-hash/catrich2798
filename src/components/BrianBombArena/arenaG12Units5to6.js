import {buildG12Unit} from './arenaG12Builder.js';
export const G12_PACKS_5_6=[
  {
    "unit": 5,
    "title": "The World of Work",
    "grammar": "Simple, Compound and Complex Sentences; Adjective + Preposition",
    "seeds": [
      [
        "@ completed the online application, and she uploaded her CV.",
        [
          "Simple",
          "Compound",
          "Complex",
          "Fragment"
        ],
        1,
        [
          "Lan",
          "Mai",
          "the candidate",
          "the graduate",
          "the job seeker"
        ],
        "Two independent clauses linked by and form a compound sentence."
      ],
      [
        "Although @ was nervous, she answered every interview question clearly.",
        [
          "Compound",
          "Simple",
          "Complex",
          "Fragment"
        ],
        2,
        [
          "the applicant",
          "Mai",
          "the intern",
          "the student",
          "the graduate"
        ],
        "Although introduces a dependent clause; the whole sentence is complex."
      ],
      [
        "@ submitted his résumé before the deadline.",
        [
          "Simple",
          "Compound",
          "Complex",
          "Run-on"
        ],
        0,
        [
          "Minh",
          "Nam",
          "the engineer",
          "the designer",
          "the programmer"
        ],
        "A sentence with one independent clause is simple."
      ],
      [
        "@ studied hard, but she did not pass the first interview.",
        [
          "Complex",
          "Compound",
          "Simple",
          "Fragment"
        ],
        1,
        [
          "Lan",
          "the applicant",
          "the student",
          "the graduate",
          "the candidate"
        ],
        "But joins two independent clauses, creating a compound sentence."
      ],
      [
        "Because @ had relevant experience, the employer offered him the job.",
        [
          "Simple",
          "Compound",
          "Complex",
          "Run-on"
        ],
        2,
        [
          "Nam",
          "Minh",
          "the applicant",
          "the engineer",
          "the designer"
        ],
        "Because starts a subordinate clause, producing a complex sentence."
      ],
      [
        "@ worked until midnight to finish the company report.",
        [
          "Complex",
          "Compound",
          "Simple",
          "Incomplete"
        ],
        2,
        [
          "Mai",
          "the employee",
          "the assistant",
          "the accountant",
          "the intern"
        ],
        "An infinitive phrase does not create a second finite clause; the sentence is simple."
      ],
      [
        "The company offered flexible hours; ___, many employees worked more efficiently.",
        [
          "however",
          "as a result",
          "although",
          "despite"
        ],
        1,
        [
          "Last year,",
          "After the survey,",
          "Following feedback,",
          "This term,",
          "During the trial,"
        ],
        "As a result connects two independent statements with a cause-and-effect meaning."
      ],
      [
        "@ was preparing for the interview when her phone rang.",
        [
          "Simple",
          "Compound",
          "Complex",
          "Fragment"
        ],
        2,
        [
          "Lan",
          "the applicant",
          "the student",
          "Mai",
          "the candidate"
        ],
        "When introduces a subordinate adverbial clause, so the sentence is complex."
      ],
      [
        "@ attended a workshop and improved her interview skills.",
        [
          "Compound",
          "Complex",
          "Simple",
          "Run-on"
        ],
        2,
        [
          "Mai",
          "the intern",
          "the candidate",
          "Lan",
          "the job seeker"
        ],
        "One subject performing two coordinated verb actions remains a simple sentence."
      ],
      [
        "@ accepted the offer; however, she requested a later start date.",
        [
          "Complex",
          "Compound",
          "Simple",
          "Incomplete"
        ],
        1,
        [
          "the candidate",
          "Lan",
          "Mai",
          "the graduate",
          "the designer"
        ],
        "The semicolon links two independent clauses, so this is compound."
      ],
      [
        "@ is good ___ solving complicated problems.",
        [
          "at",
          "in",
          "for",
          "on"
        ],
        0,
        [
          "The developer",
          "The engineer",
          "The analyst",
          "The technician",
          "The designer"
        ],
        "Good at + -ing is the correct adjective-preposition collocation."
      ],
      [
        "@ is responsible ___ managing the monthly budget.",
        [
          "to",
          "for",
          "at",
          "of"
        ],
        1,
        [
          "The accountant",
          "The manager",
          "The director",
          "The assistant",
          "The administrator"
        ],
        "Responsible for + noun/-ing."
      ],
      [
        "@ is interested ___ applying for an internship.",
        [
          "in",
          "on",
          "at",
          "to"
        ],
        0,
        [
          "Lan",
          "Mai",
          "the graduate",
          "the student",
          "the applicant"
        ],
        "Interested in + -ing."
      ],
      [
        "@ is worried ___ the upcoming job interview.",
        [
          "for",
          "with",
          "about",
          "at"
        ],
        2,
        [
          "Minh",
          "Nam",
          "the graduate",
          "the student",
          "the trainee"
        ],
        "Worried about + noun phrase."
      ],
      [
        "@ is proud ___ her professional achievements.",
        [
          "at",
          "of",
          "for",
          "to"
        ],
        1,
        [
          "the designer",
          "the scientist",
          "the manager",
          "the teacher",
          "the journalist"
        ],
        "Proud of one's achievements."
      ],
      [
        "@ is familiar ___ the new recruitment software.",
        [
          "with",
          "to",
          "of",
          "at"
        ],
        0,
        [
          "The administrator",
          "The assistant",
          "The recruiter",
          "The manager",
          "The analyst"
        ],
        "Familiar with + noun phrase."
      ],
      [
        "@ is keen ___ developing her leadership skills.",
        [
          "in",
          "for",
          "on",
          "with"
        ],
        2,
        [
          "Lan",
          "the trainee",
          "the intern",
          "Mai",
          "the graduate"
        ],
        "Keen on + -ing expresses enthusiasm."
      ],
      [
        "@ is capable ___ completing the task without help.",
        [
          "to",
          "of",
          "at",
          "for"
        ],
        1,
        [
          "The intern",
          "The assistant",
          "The engineer",
          "The trainee",
          "The candidate"
        ],
        "Capable of + -ing is the correct phrase."
      ],
      [
        "@ was surprised ___ the number of applicants.",
        [
          "by",
          "for",
          "at",
          "to"
        ],
        0,
        [
          "The interviewer",
          "The recruiter",
          "The manager",
          "The director",
          "The team leader"
        ],
        "Surprised by the number of applicants is standard usage."
      ],
      [
        "@ is satisfied ___ the working conditions at the company.",
        [
          "of",
          "with",
          "in",
          "at"
        ],
        1,
        [
          "The employee",
          "The intern",
          "The engineer",
          "The manager",
          "The designer"
        ],
        "Satisfied with + noun phrase."
      ]
    ]
  },
  {
    "unit": 6,
    "title": "Artificial Intelligence",
    "grammar": "Active and Passive Causatives (have/get something done)",
    "seeds": [
      [
        "@ had her laptop ___ by an IT technician.",
        [
          "repair",
          "repaired",
          "repairing",
          "to repair"
        ],
        1,
        [
          "Lan",
          "Mai",
          "the programmer",
          "the teacher",
          "the researcher"
        ],
        "Have + object + past participle describes arranged services."
      ],
      [
        "@ got the software ___ before the meeting.",
        [
          "installed",
          "install",
          "installing",
          "to install"
        ],
        0,
        [
          "Minh",
          "the engineer",
          "the student",
          "the developer",
          "the researcher"
        ],
        "Get something done: get + object + V3."
      ],
      [
        "@ had the engineer ___ the AI model again.",
        [
          "retrained",
          "to retrain",
          "retrain",
          "retraining"
        ],
        2,
        [
          "The director",
          "The supervisor",
          "The researcher",
          "The manager",
          "The project leader"
        ],
        "Active causative have + person + bare infinitive."
      ],
      [
        "@ got her colleague ___ the new app.",
        [
          "test",
          "testing",
          "tested",
          "to test"
        ],
        3,
        [
          "Mai",
          "the programmer",
          "the analyst",
          "the manager",
          "the scientist"
        ],
        "Active causative get + person + to-infinitive."
      ],
      [
        "@ is having her computer ___ this afternoon.",
        [
          "upgraded",
          "upgrade",
          "upgrading",
          "to upgrade"
        ],
        0,
        [
          "Lan",
          "the assistant",
          "the designer",
          "the student",
          "the lecturer"
        ],
        "Having something done uses the past participle."
      ],
      [
        "@ will have the technician ___ the broken robot tomorrow.",
        [
          "fix",
          "fixed",
          "to fix",
          "fixing"
        ],
        0,
        [
          "The engineer",
          "The director",
          "The programmer",
          "The supervisor",
          "The teacher"
        ],
        "Have + person + base form in an active causative."
      ],
      [
        "@ got the report ___ automatically by the AI system.",
        [
          "generating",
          "generated",
          "generate",
          "to generate"
        ],
        1,
        [
          "The researcher",
          "The student",
          "The developer",
          "The manager",
          "The scientist"
        ],
        "Got + object + past participle describes the result."
      ],
      [
        "@ had her voice ___ into text for the presentation.",
        [
          "convert",
          "converted",
          "converting",
          "to convert"
        ],
        1,
        [
          "The lecturer",
          "The teacher",
          "The journalist",
          "The researcher",
          "The presenter"
        ],
        "Had something converted means arranged for it to be converted."
      ],
      [
        "@ got the trainees ___ the AI-generated answers carefully.",
        [
          "check",
          "checked",
          "checking",
          "to check"
        ],
        3,
        [
          "The supervisor",
          "The manager",
          "The trainer",
          "The director",
          "The lecturer"
        ],
        "Get someone to do something takes a to-infinitive."
      ],
      [
        "@ had the chatbot ___ by a security expert.",
        [
          "auditing",
          "audit",
          "audited",
          "to audit"
        ],
        2,
        [
          "The team",
          "The company",
          "The developer",
          "The university",
          "The laboratory"
        ],
        "Had + object + V3 for a paid or arranged service."
      ],
      [
        "@ will get the database ___ before the system launch.",
        [
          "updating",
          "updated",
          "update",
          "to update"
        ],
        1,
        [
          "The team leader",
          "The engineer",
          "The researcher",
          "The manager",
          "The analyst"
        ],
        "Get something updated: past participle after the object."
      ],
      [
        "@ had the students ___ the accuracy of the search results.",
        [
          "verify",
          "verified",
          "to verify",
          "verifying"
        ],
        0,
        [
          "The teacher",
          "The instructor",
          "The lecturer",
          "The professor",
          "The trainer"
        ],
        "Have + person + bare infinitive in active causative."
      ],
      [
        "@ got the assistant ___ the algorithm step by step.",
        [
          "explained",
          "explain",
          "explaining",
          "to explain"
        ],
        3,
        [
          "The manager",
          "The researcher",
          "The instructor",
          "The engineer",
          "The trainer"
        ],
        "Get someone to explain something takes to + verb."
      ],
      [
        "@ had his screen ___ after the training session.",
        [
          "replaced",
          "replace",
          "replacing",
          "to replace"
        ],
        0,
        [
          "Minh",
          "the engineer",
          "the programmer",
          "the analyst",
          "the trainer"
        ],
        "Have an object replaced, not replace."
      ],
      [
        "@ is getting the image files ___ by an AI tool.",
        [
          "sorted",
          "sort",
          "sorting",
          "to sort"
        ],
        0,
        [
          "The photographer",
          "The designer",
          "The researcher",
          "The archivist",
          "The journalist"
        ],
        "Getting something done uses V3 after the object."
      ],
      [
        "@ had a developer ___ the privacy settings.",
        [
          "checked",
          "check",
          "to check",
          "checking"
        ],
        1,
        [
          "The company",
          "The laboratory",
          "The project team",
          "The school",
          "The hospital"
        ],
        "Active have + person + bare infinitive."
      ],
      [
        "@ got the user manual ___ into Vietnamese.",
        [
          "translate",
          "translated",
          "translating",
          "to translate"
        ],
        1,
        [
          "The company",
          "The school",
          "The trainer",
          "The university",
          "The organisation"
        ],
        "Get an object translated is passive causative."
      ],
      [
        "@ had the robot ___ by specialists before the show.",
        [
          "inspect",
          "inspected",
          "inspecting",
          "to inspect"
        ],
        1,
        [
          "The engineer",
          "The school",
          "The scientist",
          "The lab director",
          "The technician"
        ],
        "Have + object + past participle."
      ],
      [
        "@ got the researchers ___ the data a second time.",
        [
          "to analyse",
          "analyse",
          "analysed",
          "analysing"
        ],
        0,
        [
          "The director",
          "The professor",
          "The supervisor",
          "The company",
          "The manager"
        ],
        "Get + person + to-infinitive."
      ],
      [
        "@ had the old AI system ___ with a more secure version.",
        [
          "replace",
          "replacing",
          "replaced",
          "to replace"
        ],
        2,
        [
          "The company",
          "The university",
          "The school",
          "The hospital",
          "The research institute"
        ],
        "Passive causative have something replaced uses V3."
      ]
    ]
  }
].map(buildG12Unit);
