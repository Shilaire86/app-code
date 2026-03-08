/**
 * Mindset Journal Prompts Library
 * 
 * Curated prompts for gratitude, intention, and reflection journaling.
 */

export interface Prompt {
    id: string;
    category: 'gratitude' | 'intention' | 'reflection';
    text: string;
}

export const GRATITUDE_PROMPTS: Prompt[] = [
    { id: 'g1', category: 'gratitude', text: "What's one small thing that brought you joy today?" },
    { id: 'g2', category: 'gratitude', text: "Who in your life are you grateful for and why?" },
    { id: 'g3', category: 'gratitude', text: "What challenge taught you something valuable recently?" },
    { id: 'g4', category: 'gratitude', text: "What's something about your body you appreciate?" },
    { id: 'g5', category: 'gratitude', text: "What skill or ability are you thankful to have?" },
    { id: 'g6', category: 'gratitude', text: "What's a recent accomplishment you're proud of?" },
    { id: 'g7', category: 'gratitude', text: "What's something in nature that inspires you?" },
    { id: 'g8', category: 'gratitude', text: "What comfort or convenience do you often take for granted?" },
    { id: 'g9', category: 'gratitude', text: "What's a memory that always makes you smile?" },
    { id: 'g10', category: 'gratitude', text: "What opportunity are you grateful for right now?" },
    { id: 'g11', category: 'gratitude', text: "What's something beautiful you noticed today?" },
    { id: 'g12', category: 'gratitude', text: "Who has helped shape who you are today?" },
    { id: 'g13', category: 'gratitude', text: "What lesson from a failure are you now grateful for?" },
    { id: 'g14', category: 'gratitude', text: "What's something that made you laugh recently?" },
    { id: 'g15', category: 'gratitude', text: "What strength do you possess that you're thankful for?" },
];

export const INTENTION_PROMPTS: Prompt[] = [
    { id: 'i1', category: 'intention', text: "What's one thing you want to accomplish today?" },
    { id: 'i2', category: 'intention', text: "How will you show up as your best self today?" },
    { id: 'i3', category: 'intention', text: "What energy do you want to bring to your interactions?" },
    { id: 'i4', category: 'intention', text: "What's one habit you'll focus on strengthening?" },
    { id: 'i5', category: 'intention', text: "How will you prioritize your wellbeing today?" },
    { id: 'i6', category: 'intention', text: "What boundary will you honor for yourself?" },
    { id: 'i7', category: 'intention', text: "How will you move your body with intention today?" },
    { id: 'i8', category: 'intention', text: "What mindset will you embrace when facing challenges?" },
    { id: 'i9', category: 'intention', text: "How will you practice patience today?" },
    { id: 'i10', category: 'intention', text: "What's one way you'll step outside your comfort zone?" },
    { id: 'i11', category: 'intention', text: "How will you nourish your mind, body, or spirit?" },
    { id: 'i12', category: 'intention', text: "What will you let go of that no longer serves you?" },
    { id: 'i13', category: 'intention', text: "How will you be present in this moment?" },
    { id: 'i14', category: 'intention', text: "What positive affirmation will guide your day?" },
    { id: 'i15', category: 'intention', text: "How will you celebrate small wins today?" },
];

export const REFLECTION_PROMPTS: Prompt[] = [
    { id: 'r1', category: 'reflection', text: "What did you learn about yourself today?" },
    { id: 'r2', category: 'reflection', text: "What moment are you most proud of?" },
    { id: 'r3', category: 'reflection', text: "What could you have done differently?" },
    { id: 'r4', category: 'reflection', text: "How did you show resilience today?" },
    { id: 'r5', category: 'reflection', text: "What's something you're still processing?" },
    { id: 'r6', category: 'reflection', text: "How did you honor your intentions today?" },
    { id: 'r7', category: 'reflection', text: "What surprised you about today?" },
    { id: 'r8', category: 'reflection', text: "Where did you notice growth in yourself?" },
    { id: 'r9', category: 'reflection', text: "What relationship did you nurture today?" },
    { id: 'r10', category: 'reflection', text: "How did you handle stress or frustration?" },
    { id: 'r11', category: 'reflection', text: "What would your future self thank you for doing today?" },
    { id: 'r12', category: 'reflection', text: "What's one thing you wish you'd done more of?" },
    { id: 'r13', category: 'reflection', text: "How did you practice self-compassion?" },
    { id: 'r14', category: 'reflection', text: "What insight came from a challenge you faced?" },
    { id: 'r15', category: 'reflection', text: "What will you carry forward into tomorrow?" },
];

/**
 * Get a random prompt for a specific category
 */
export function getRandomPrompt(category: 'gratitude' | 'intention' | 'reflection'): Prompt {
    const prompts = category === 'gratitude'
        ? GRATITUDE_PROMPTS
        : category === 'intention'
            ? INTENTION_PROMPTS
            : REFLECTION_PROMPTS;

    return prompts[Math.floor(Math.random() * prompts.length)];
}

/**
 * Get today's daily prompts (one per category, consistent for the day)
 */
export function getDailyPrompts(): { gratitude: Prompt; intention: Prompt; reflection: Prompt } {
    // Use today's date as seed for consistent daily prompts
    const today = new Date();
    const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();

    const gIndex = seed % GRATITUDE_PROMPTS.length;
    const iIndex = (seed + 1) % INTENTION_PROMPTS.length;
    const rIndex = (seed + 2) % REFLECTION_PROMPTS.length;

    return {
        gratitude: GRATITUDE_PROMPTS[gIndex],
        intention: INTENTION_PROMPTS[iIndex],
        reflection: REFLECTION_PROMPTS[rIndex],
    };
}
