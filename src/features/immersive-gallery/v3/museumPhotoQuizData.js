// Questions are attached to the published exhibit IDs so room and image order may change.
const questions = {
 // Hội An Ancient Town
 '3b54c350-0320-4dc9-8196-754838af8b32': {
  question: "What stands out on the boat closest to the camera?",
  options: ["A bright yellow cover", "A tall white sail", "A row of blue seats"],
  answer: 0,
  explanation: "The nearest boat has a bright yellow cover, and the old trading town lies across the river.",
 },
 '54e0e0e1-dcf9-4923-9f70-81b9b8f3bffa': {
  question: "What hangs across the street between the shopfronts?",
  options: ["Bamboo baskets", "Colourful lanterns", "Wooden signboards"],
  answer: 1,
  explanation: "Strings of colourful lanterns stretch above the narrow street.",
 },
 'ce7e02d5-9d46-4c5e-b4d8-a6c42db63804': {
  question: "Where should you stand to photograph a doorway in this narrow alley?",
  options: ["In the middle of the alley", "Directly in front of the doorway", "To one side, with the entrance clear"],
  answer: 2,
  explanation: "The narrow alley is a shared space, so residents and shopkeepers need room to pass.",
 },
 // Tràng An
 '59ed29f9-abff-461d-9a3c-092815c8230a': {
  question: "What rises on either side of the waterway in this view of Tràng An?",
  options: ["Brick towers", "Steep limestone hills", "Rows of timber houses"],
  answer: 1,
  explanation: "The boats travel between steep, green limestone hills.",
 },
 '9d308b6b-e2cc-4a1c-93ac-bb086ac16f4f': {
  question: "Which detail shows that the photograph was taken from inside a cave opening?",
  options: ["The reflections beneath the boats", "The hills in the distance", "The dark rock across the top of the image"],
  answer: 2,
  explanation: "The overhanging rock forms a dark frame above the boats and the valley beyond.",
 },
 '2a1386e2-c82d-4bfa-ab3c-4a29c5922f29': {
  question: "What should you do when your boat approaches a low opening like this one?",
  options: ["Stay seated and listen to the boat operator", "Stand up to see the opening more clearly", "Reach out to feel the rock"],
  answer: 0,
  explanation: "Staying seated and keeping your hands inside the boat gives you room to pass safely.",
 },
 // Angkor
 '13a8830c-d112-400b-92c5-3a6b5173b135': {
  question: "Where can you see a second outline of the temple towers?",
  options: ["In the clouds", "Behind the palm trees", "In the water in front of the temple"],
  answer: 2,
  explanation: "The water reflects the towers of Angkor Wat.",
 },
 'f39131b4-2da0-4c96-8a01-3d6e0ac02ea1': {
  question: "What is carved into the Bayon's stone towers in this close-up?",
  options: ["Large human faces", "Rows of lotus flowers", "Pairs of elephants"],
  answer: 0,
  explanation: "The faces are carved into the towers themselves, so sculpture is part of the building.",
 },
 '558cb9a2-3c51-44ac-9557-1606e0293bee': {
  question: "Which outfit follows the advice for visiting the temple ahead?",
  options: ["A sleeveless top and long trousers", "A top with sleeves and trousers below the knees", "A short-sleeved top and shorts above the knees"],
  answer: 1,
  explanation: "The caption asks visitors to cover both shoulders and knees in temple areas.",
 },
 // Luang Prabang
 '21375a6c-caf1-4c05-8352-78181e36b27f': {
  question: "What natural feature does this view from the tip of the old town show?",
  options: ["Two rivers meeting", "A waterfall dropping into a pool", "A canal entering the sea"],
  answer: 0,
  explanation: "The Mekong and Nam Khan rivers meet at the tip of the peninsula.",
 },
 '7ee50c58-5b12-4f8c-8fdf-5762a825dad7': {
  question: "Which part of the temple best illustrates the sloping style mentioned in the caption?",
  options: ["The straight front steps", "The layered roofs with pointed tips", "The railings at the base"],
  answer: 1,
  explanation: "Several steep roof layers end in upward-pointing tips.",
 },
 '641c623d-54e4-4980-814b-cd76b7fba226': {
  question: "If someone is praying near this entrance, what should you do before photographing them?",
  options: ["Move closer so they can see the camera", "Take a quick picture from the side", "Ask them for permission"],
  answer: 2,
  explanation: "Asking first respects worshippers, and keeping the doorway clear lets them pass.",
 },
 // Ayutthaya
 '336fde6c-d477-4523-849f-cbc3d5425062': {
  question: "Which feature in the image helps explain why the old city could trade by boat?",
  options: ["The trees along the bank", "The river running through the view", "The buildings on the right"],
  answer: 1,
  explanation: "Ayutthaya grew into a trading centre on an island surrounded by rivers.",
 },
 '37462f44-0e3a-4eb0-9332-70fb9b860d13': {
  question: "What contrast does the lighting make easy to see at Wat Phra Si Sanphet?",
  options: ["Dark roofs against white steps", "Tall trees against a low gate", "Tall brick towers against low ruined walls"],
  answer: 2,
  explanation: "The illuminated towers rise well above the remains of the walls around them.",
 },
 'e6c41dd1-4342-4098-ad4c-ce74016f4e08': {
  question: "You want a wider photograph of the ruins. What should you do?",
  options: ["Step back along the marked path", "Climb onto a wall to gain height", "Walk up the side of a tower"],
  answer: 0,
  explanation: "Stepping back on the route gives a wider view and protects the old brickwork.",
 },
 // Melaka
 'c7bda7cd-8a1c-439e-95e4-363d53abf38c': {
  question: "Where are the rows of buildings in relation to the promenade?",
  options: ["On the same bank as the promenade", "Above it on a steep hillside", "Across the water on the opposite bank"],
  answer: 2,
  explanation: "The walkway follows one bank of the Melaka River, and the row of buildings lines the other.",
 },
 '201e66d4-6cf0-4513-be29-7c4fe44f4279': {
  question: "Which two features frame the central flower bed in this square?",
  options: ["A tower on the left and red buildings on the right", "A stone arch on the left and boats on the right", "A row of houses on the left and a river on the right"],
  answer: 0,
  explanation: "The tower and red buildings sit around the same public square.",
 },
 '3e4f0279-917f-4c9b-8b00-cf87b6d0ec2b': {
  question: "You want to reach the buildings across this street. How should you cross?",
  options: ["Between two parked vehicles", "At a designated crossing", "Diagonally from the nearest doorway"],
  answer: 1,
  explanation: "The caption asks visitors to use a designated crossing when moving between the historic buildings.",
 },
 // George Town
 'e4d9e018-433c-40ac-bfb5-35a87c1272a2': {
  question: "From where was this view of the skyline taken?",
  options: ["From the water, looking toward the shore", "From under a covered walkway", "From a street between tall buildings"],
  answer: 0,
  explanation: "The water fills the foreground of this view from a ferry.",
 },
 '157a665d-0894-4bf5-bade-006d550eb552': {
  question: "Which pair of details best shows two different uses of the same shophouse?",
  options: ["The tiled roofs and the road markings", "Shop entrances below and windows above", "The parked cars and the kerb"],
  answer: 1,
  explanation: "The ground-floor shopfronts and the upper-storey windows reflect trade and domestic life in one building.",
 },
 '8ddc0384-c081-41d0-aa55-da7d51f6a71e': {
  question: "How can you stop for a photo in this covered walkway and let others pass?",
  options: ["Stand across the middle of the passage", "Rest your bag opposite you against a column", "Move to one side and keep the passage clear"],
  answer: 2,
  explanation: "The covered walkway is used by pedestrians, so leave them a clear route.",
 },
 // Singapore Botanic Gardens
 '63e36472-5208-4e43-91cd-44517ee0550a': {
  question: "What frames the entrance gate in this photograph?",
  options: ["A pair of glass walls", "White pillars", "Rows of brick archways"],
  answer: 1,
  explanation: "The metal entrance gate is set between white pillars.",
 },
 '37ca61a2-ad10-4a32-976f-3f7ff3abb441': {
  question: "What information would a plant label like the one shown help a visitor look for?",
  options: ["Which path is shortest", "When the next tour starts", "Where a plant species comes from"],
  answer: 2,
  explanation: "The caption highlights plant labels as a way to learn about the origin of a species.",
 },
 '31a4e5be-efe0-4955-a6cd-77c2cc6ef4ca': {
  question: "You spot a leaf you want to photograph beside this path. What should you do?",
  options: ["Stand to the side and photograph it where it grows", "Pick it up and hold it against the sky", "Stop in the middle of the path and bend the stem"],
  answer: 0,
  explanation: "Staying to one side keeps the path open, and leaving the leaf in place lets others see it.",
 },
 // Borobudur
 'c046440e-790f-4af5-964b-d9c74f26263d': {
  question: "Which shapes rise above the stone platform in this view?",
  options: ["Tall rectangular chimneys", "Wide gateways with flat tops", "Rounded stupas with pointed tops"],
  answer: 2,
  explanation: "The rounded stone structures with pointed tops are stupas.",
 },
 '0f07a86b-78e0-4573-b91d-e39a584b4687': {
  question: "What detail should you look for in this close-up of a square terrace?",
  options: ["Figures carved into the stone", "A pattern painted on wooden doors", "A row of circular openings"],
  answer: 0,
  explanation: "The stone relief shows carved figures, a feature the caption links to the square terraces.",
 },
 '0bdf399b-3347-4a5d-93ec-b32b80bded37': {
  question: "What is the best first step when a sign like this stands by the terraces?",
  options: ["Use the diagram to choose any shortcut", "Read the instructions and check where visitors may enter", "Follow the first group you see past the sign"],
  answer: 1,
  explanation: "The sign helps visitors check access and follow the designated route.",
 },
 // Vigan
 '137b69b5-af44-4ed8-99ce-37148fa56d23': {
  question: "What is travelling down the middle of this historic street?",
  options: ["A horse-drawn carriage", "A motorbike", "A pedal bicycle"],
  answer: 0,
  explanation: "A horse-drawn carriage is visible between the rows of historic buildings.",
 },
 'a0bdeee9-c2b8-4a98-b5d5-a31593554666': {
  question: "Which details would help you compare the houses in this evening street view?",
  options: ["The street lamps and shop signs", "The windows and upper floors", "The paving stones and carriage wheels"],
  answer: 1,
  explanation: "The caption suggests comparing windows and upper floors to find shared features in the houses.",
 },
 'f5af2c45-012d-4d2c-aed5-02250206c776': {
  question: "Before stepping into this historic house for a closer look, what should you check?",
  options: ["Whether the façade is lit by the sun", "Whether the street is wide enough for a carriage", "Whether the house admits visitors"],
  answer: 2,
  explanation: "A historic house may have restricted access, so check whether it is open to visitors.",
 },
};

export function museumPhotoQuiz(exhibit){
 return exhibit?.kind==='image'&&Object.hasOwn(questions,exhibit.id)?questions[exhibit.id]:null;
}
