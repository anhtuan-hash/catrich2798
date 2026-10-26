// Original classroom prompts with suggested answers. Points are game design values,
// NOT measurements from a real survey of 100 people.
const WEIGHTS=[[32,24,17,12,9,6],[35,25,15,12,8,5],[30,23,19,14,9,5],[28,24,20,14,9,5]];
const RAW=[
  ['English 10 · School life','Name something students bring to class.',['A notebook','A pen','A textbook','A water bottle','A school bag','A phone']],
  ['English 10 · School life','Name an activity students do during a break.',['Chat with friends','Eat a snack','Play sports','Listen to music','Read a book','Walk around']],
  ['English 10 · School life','Name a reason students join a school club.',['Make friends','Learn a new skill','Have fun','Follow an interest','Improve teamwork','Gain experience']],
  ['English 10 · Family','Name a way to help your family at home.',['Wash the dishes','Clean the house','Cook meals','Do the laundry','Take out rubbish','Look after siblings']],
  ['English 10 · Family','Name a special occasion families celebrate together.',['A birthday','New Year','A wedding','A graduation','A family reunion','A festival']],
  ['English 10 · Music','Name a musical instrument you might see in a band.',['Guitar','Drums','Keyboard','Bass guitar','Saxophone','Violin']],
  ['English 10 · Volunteering','Name a volunteer activity teenagers can do.',['Clean a park','Plant trees','Donate books','Tutor children','Collect clothes','Help older people']],
  ['English 10 · Technology','Name a common use for a smartphone.',['Send messages','Take photos','Call someone','Study online','Watch videos','Find directions']],
  ['English 10 · Travel','Name something to pack for a weekend trip.',['Clothes','Toothbrush','Phone charger','Shoes','Travel documents','Medicine']],
  ['English 10 · Health','Name a healthy daily habit.',['Exercise regularly','Drink water','Sleep enough','Eat vegetables','Wash your hands','Limit screen time']],
  ['English 11 · Environment','Name a way students can save electricity at school.',['Turn off lights','Switch off fans','Unplug chargers','Use daylight','Turn off projectors','Use energy-saving bulbs']],
  ['English 11 · Environment','Name something you can reuse instead of throwing away.',['A water bottle','A shopping bag','A lunch box','A glass jar','A cardboard box','A notebook']],
  ['English 11 · Climate','Name an effect of global warming.',['Rising sea levels','Heatwaves','Extreme storms','Droughts','Melting glaciers','Loss of habitats']],
  ['English 11 · Climate','Name a source of renewable energy.',['Solar power','Wind power','Hydropower','Geothermal energy','Biomass','Tidal energy']],
  ['English 11 · Wildlife','Name an animal that people work to protect.',['Elephant','Sea turtle','Tiger','Panda','Whale','Rhino']],
  ['English 11 · Sustainable living','Name a way to reduce plastic waste.',['Carry a reusable bottle','Use a cloth bag','Avoid plastic straws','Refill containers','Buy unpackaged food','Reuse lunch boxes']],
  ['English 11 · Healthy living','Name something teenagers can do to manage stress.',['Talk to a friend','Get enough sleep','Do exercise','Listen to music','Take a break','Practice breathing']],
  ['English 11 · Community','Name a benefit of volunteering in your community.',['Help people','Make friends','Learn skills','Build confidence','Gain experience','Understand problems']],
  ['English 11 · Cities','Name a problem in a crowded city.',['Traffic jams','Air pollution','Noise','High housing costs','Not enough parks','Overcrowded buses']],
  ['English 11 · Education','Name a useful way to learn English outside class.',['Watch videos','Read in English','Talk with friends','Listen to podcasts','Use flashcards','Keep a journal']],
  ['English 12 · Careers','Name a skill employers look for in new graduates.',['Communication','Teamwork','Problem solving','Digital literacy','Time management','Creativity']],
  ['English 12 · Careers','Name something to prepare for a job interview.',['A résumé','Interview answers','Smart clothes','Company research','Questions to ask','A portfolio']],
  ['English 12 · Careers','Name a career that uses science and technology.',['Software engineer','Doctor','Robotics engineer','Research scientist','Data analyst','Lab technician']],
  ['English 12 · Future jobs','Name a job task that computers can help with.',['Data analysis','Scheduling','Translation','Customer support','Record keeping','Image editing']],
  ['English 12 · Lifelong learning','Name a reason adults return to education.',['Improve job skills','Change careers','Earn a qualification','Follow a passion','Get a promotion','Keep up with technology']],
  ['English 12 · Media','Name a way people check whether online news is trustworthy.',['Check the source','Compare news outlets','Look for evidence','Check the date','Read fact checks','Find the original report']],
  ['English 12 · Urbanisation','Name something that makes a city easier to live in.',['Good public transport','Green parks','Affordable housing','Clean water','Safe streets','Accessible healthcare']],
  ['English 12 · Conservation','Name an action that helps endangered animals.',['Protect habitats','Stop illegal hunting','Rescue injured animals','Educate communities','Reduce pollution','Support wildlife parks']],
  ['English 12 · Technology','Name a possible risk of using AI at work.',['Privacy leaks','Incorrect answers','Unfair bias','Over-reliance','Job disruption','Fake content']],
  ['English 12 · International culture','Name a way students can learn about another culture.',['Learn its language','Try traditional food','Read local stories','Join an exchange','Watch documentaries','Visit a museum']],
];
export const FAMILY_FEUD_BANK=Object.freeze(RAW.map(([category,prompt,answers],index)=>Object.freeze({
 id:'bff-'+String(index+1).padStart(3,'0'),category,prompt,
 answers:Object.freeze(answers.map((text,i)=>Object.freeze({text,points:WEIGHTS[index%WEIGHTS.length][i]})))
})));
export const FAMILY_FEUD_BANK_NOTICE='Suggested answers and scores are teacher-authored gameplay values, not real survey data.';
