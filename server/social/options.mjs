// Profile choices for Social. Mirrors src/config/social-profile.ts; the server is the authority for what is stored.
export const hereFor = ['friends', 'makan', 'more'];
export const genders = ['woman', 'man'];
export const religions = ['Buddhist', 'Taoist', 'Christian', 'Catholic', 'Muslim', 'Hindu', 'Sikh', 'Jain', 'Free thinker', 'Spiritual', 'Other', 'Prefer not to say'];
export const ethnicities = ['Chinese', 'Malay', 'Indian', 'Eurasian', 'Other', 'Prefer not to say'];
export const whyPlantBased = ['Religion', 'Ethics', 'Health', 'Environment', 'Family', 'Taste'];
export const hobbies = ['Hiking', 'Cycling', 'Running', 'Gym', 'Yoga', 'Badminton', 'Pickleball', 'Bouldering', 'Swimming', 'Board games', 'Gaming', 'K-drama',
  'Anime', 'Movies', 'Reading', 'Writing', 'Photography', 'Drawing', 'Music', 'Live music', 'Karaoke', 'Dancing', 'Café hopping', 'Baking', 'Cooking',
  'Gardening', 'Volunteering', 'Temple volunteering', 'Meditation', 'Travel', 'Museums', 'Thrifting', 'Crafts', 'Pets', 'Language learning', 'Tech',
  'Investing', 'Fashion', 'Camping', 'Fishing'];
export const languages = ['English', 'Mandarin', 'Malay', 'Tamil', 'Hokkien', 'Cantonese', 'Teochew', 'Hakka', 'Japanese', 'Korean', 'Hindi', 'Other'];
export const educations = ['Secondary', 'Diploma', 'Degree', 'Postgraduate', 'Prefer not to say'];
export const habits = ['No', 'Sometimes', 'Yes'];
export const families = ['Want kids', "Don't want kids", 'Open', 'Have kids'];
export const pets = ['Dog', 'Cat', 'Other', 'None'];
export const prompts = ['My go-to hawker order', "A dish I'll cross the island for", 'I can teach you to cook', 'Teach me to cook', 'My kopi order says',
  'The stall I would defend in an argument', 'Best thing I ate this month', 'My comfort food', 'A perfect Saturday', 'I am weirdly good at',
  'Green flag at the table', 'Two truths and a lie', 'The way to win me over', 'My most-cooked recipe', 'A food I changed my mind about',
  'My plant-based story', 'Ask me about', 'This year I want to', 'Dessert or no dessert', 'My simple pleasures'];
/** Profile fields a member may hide; hidden fields are never sent to others or used to suggest people. */
export const hideable = ['age', 'gender', 'religion', 'ethnicity', 'why', 'hobbies', 'languages', 'education', 'work', 'grewUp', 'height', 'drinking', 'smoking', 'family', 'pets', 'spots'];
