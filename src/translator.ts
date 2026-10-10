/**
 * HMS VoicePulse - Multilingual Clinical Translation & Severity Analysis Engine
 * Translates Tamil (தமிழ்), Hindi (हिन्दी), Telugu (తెలుగు), Bengali (বাংলা), etc. to English.
 * Supports both high-speed tokenized dictionary translation and Neural API translation.
 * Extracts structured medical entities with comparative symptom severity ranking (1-10 scale).
 */

export interface SymptomSeverity {
  symptom: string;
  severity: 'Severe' | 'Moderate' | 'Mild';
  score: number; // 1 to 10 scale (who is more or less)
  detectedCue?: string;
}

export interface TranslationResult {
  translatedText: string;
  detectedLang: 'English' | 'Hindi' | 'Tamil' | 'Telugu' | 'Bengali' | 'Other';
  detectedLangNative: string;
  isTranslated: boolean;
  prescriptions: string[];
}

// In-memory cache for fast repeated translations
const translationCache = new Map<string, string>();

/**
 * Detect Language of incoming speech text
 */
export function detectLanguage(text: string): 'English' | 'Hindi' | 'Tamil' | 'Telugu' | 'Bengali' | 'Other' {
  if (!text || !text.trim()) return 'English';

  // Devanagari Unicode block (U+0900 to U+097F) -> Hindi
  if (/[\u0900-\u097F]/.test(text)) return 'Hindi';

  // Tamil Unicode block (U+0B80 to U+0BFF) -> Tamil
  if (/[\u0B80-\u0BFF]/.test(text)) return 'Tamil';

  // Telugu Unicode block (U+0C00 to U+0C7F) -> Telugu
  if (/[\u0C00-\u0C7F]/.test(text)) return 'Telugu';

  // Bengali Unicode block (U+0980 to U+09FF) -> Bengali
  if (/[\u0980-\u09FF]/.test(text)) return 'Bengali';

  // Common transliterated Hindi / Hinglish keywords
  const textLower = text.toLowerCase();
  const hindiKeywords = [
    'bukhar', 'sirdard', 'sir dard', 'sar dard', 'badan dard', 'pet dard', 'khansi',
    'jukam', 'zukam', 'ulti', 'chakkar', 'dawa', 'dawai', 'goli', 'mariz', 'mareez',
    'tez', 'bahut', 'halka', 'din me', 'khane ke baad', 'khali pet', 'subah', 'shaam',
    'raat', 'dard ho raha', 'takleef', 'kamzori', 'saans'
  ];
  if (hindiKeywords.some(kw => textLower.includes(kw))) return 'Hindi';

  // Common transliterated Tamil / Tanglish keywords
  const tamilKeywords = [
    'kaichal', 'kaychal', 'thalaivali', 'thalai vali', 'udal vali', 'udambu vali',
    'thondai vali', 'irumal', 'sali', 'vaanthi', 'mayakkam', 'maathirai', 'marunthu',
    'noyali', 'naatkalukku', 'irukku', 'ullathu', 'saapidavum', 'kudikkavum', 'kadumaiyana'
  ];
  if (tamilKeywords.some(kw => textLower.includes(kw))) return 'Tamil';

  return 'English';
}

// ============================================================================
// COMPREHENSIVE MEDICAL & CONVERSATIONAL DICTIONARY
// ============================================================================

// Multi-word phrase mappings for Hindi (Devanagari & Romanized/Hinglish)
// Uses Unicode property boundaries (?<=^|\P{L}) and (?=$|\P{L}) so Devanagari words match reliably!
const HINDI_PHRASES: [RegExp, string][] = [
  // Prescriptions & Timings
  [/(?<=^|\P{L})(?:दिन में (?:दो|2) बार|din me(?:in)? (?:do|2) baar|din me do bar)(?=$|\P{L})/giu, 'twice daily (BID)'],
  [/(?<=^|\P{L})(?:दिन में (?:तीन|3) बार|din me(?:in)? (?:teen|3) baar)(?=$|\P{L})/giu, 'three times daily (TID)'],
  [/(?<=^|\P{L})(?:दिन में (?:एक|1) बार|din me(?:in)? (?:ek|1) baar|roz ek baar)(?=$|\P{L})/giu, 'once daily (OD)'],
  [/(?<=^|\P{L})(?:खाना खाने के बाद|khana khane ke baad|khane ke baad|bhojan ke baad)(?=$|\P{L})/giu, 'after meals (post-prandial)'],
  [/(?<=^|\P{L})(?:खाना खाने से पहले|खाली पेट|khana khane se pehle|khali pet)(?=$|\P{L})/giu, 'before meals / on an empty stomach (ante-prandial)'],
  [/(?<=^|\P{L})(?:रात को सोते समय|सोते वक्त|raat ko sote samay|sote waqt)(?=$|\P{L})/giu, 'at bedtime (HS)'],
  [/(?<=^|\P{L})(?:सुबह और शाम|सुबह शाम|subah aur shaam|subah shaam)(?=$|\P{L})/giu, 'morning and evening (BID)'],
  [/(?<=^|\P{L})(?:सुबह दोपहर शाम|subah dopahar shaam)(?=$|\P{L})/giu, 'morning, afternoon and evening (TID)'],
  [/(?<=^|\P{L})(?:गुनगुने पानी के साथ|gungune paani ke saath|garam pani ke sath)(?=$|\P{L})/giu, 'with lukewarm water'],
  [/(?<=^|\P{L})(?:खूब पानी पिएं|पानी ज्यादा पिएं|khoob paani piyein|pani zyada piyein)(?=$|\P{L})/giu, 'maintain adequate oral fluid intake'],
  [/(?<=^|\P{L})(?:पूरा आराम करें|आराम करने की सलाह|poora aaram karein|aaram karne ki salah|rest karein)(?=$|\P{L})/giu, 'advised complete bed rest'],
  [/(?<=^|\P{L})(?:3|तीन)\s*(?:दिन|din)\s*(?:तक|tak|ke liye)(?=$|\P{L})/giu, 'for 3 days'],
  [/(?<=^|\P{L})(?:5|पांच)\s*(?:दिन|din)\s*(?:तक|tak|ke liye)(?=$|\P{L})/giu, 'for 5 days'],
  [/(?<=^|\P{L})(?:7|सात)\s*(?:दिन|din)\s*(?:तक|tak|ke liye)(?=$|\P{L})/giu, 'for 7 days'],
  [/(?<=^|\P{L})(?:3|तीन)\s*(?:दिन|din)\s*(?:से|se)(?=$|\P{L})/giu, 'for 3 days'],
  [/(?<=^|\P{L})(?:2|दो)\s*(?:दिन|din)\s*(?:से|se)(?=$|\P{L})/giu, 'for 2 days'],
  [/(?<=^|\P{L})(?:4|चार)\s*(?:दिन|din)\s*(?:से|se)(?=$|\P{L})/giu, 'for 4 days'],
  [/(?<=^|\P{L})(?:5|पांच)\s*(?:दिन|din)\s*(?:से|se)(?=$|\P{L})/giu, 'for 5 days'],
  [/(?<=^|\P{L})(?:कल से|kal se)(?=$|\P{L})/giu, 'since yesterday'],
  [/(?<=^|\P{L})(?:आज सुबह से|aaj subah se)(?=$|\P{L})/giu, 'since this morning'],

  // Severe / Moderate Symptoms
  [/(?<=^|\P{L})(?:बहुत तेज बुखार|तेज बुखार|bahut tez bukhar|bahut jyada bukhar|tez bukhar)(?=$|\P{L})/giu, 'severe high-grade fever'],
  [/(?<=^|\P{L})(?:हल्का बुखार|धीमा बुखार|halka bukhar|kam bukhar)(?=$|\P{L})/giu, 'mild low-grade fever'],
  [/(?<=^|\P{L})(?:सिर में बहुत दर्द|सिर में तेज दर्द|sir me bahut dard|sar me tez dard)(?=$|\P{L})/giu, 'severe acute headache'],
  [/(?<=^|\P{L})(?:सिरदर्द|सिर दर्द|सर दर्द|sirdard|sir dard|sar dard|sir me dard|sar me dard)(?=$|\P{L})/giu, 'headache'],
  [/(?<=^|\P{L})(?:बदन में दर्द|पूरे बदन में दर्द|बदन दर्द|badan me dard|badan dard|poore badan me dard)(?=$|\P{L})/giu, 'generalized body aches and myalgia'],
  [/(?<=^|\P{L})(?:पेट में तेज दर्द|पेट में गंभीर दर्द|pet me tez dard|pet me gambhir dard)(?=$|\P{L})/giu, 'acute severe abdominal pain'],
  [/(?<=^|\P{L})(?:पेट दर्द|पेट में दर्द|pet dard|pet me dard)(?=$|\P{L})/giu, 'abdominal / stomach pain'],
  [/(?<=^|\P{L})(?:छाती में दर्द|सीने में दर्द|chhati me dard|seene me dard|chhati dard)(?=$|\P{L})/giu, 'chest pain'],
  [/(?<=^|\P{L})(?:सांस लेने में तकलीफ|सांस फूलना|saans lene me takleef|saans foolna|saas foolna)(?=$|\P{L})/giu, 'shortness of breath / dyspnea'],
  [/(?<=^|\P{L})(?:गले में खराश|गले में दर्द|gale me kharash|gale me dard)(?=$|\P{L})/giu, 'sore throat and pharyngitis'],
  [/(?<=^|\P{L})(?:सूखी खांसी|sukhi khansi)(?=$|\P{L})/giu, 'dry persistent cough'],
  [/(?<=^|\P{L})(?:बलगम वाली खांसी|balgam wali khansi)(?=$|\P{L})/giu, 'productive cough with phlegm'],
  [/(?<=^|\P{L})(?:ठंड लगकर बुखार|ठंड लगना|thand lagkar bukhar|thand lagna|kaanpna)(?=$|\P{L})/giu, 'fever with chills and shivering'],
  [/(?<=^|\P{L})(?:उल्टी और दस्त|उल्टी दस्त|ulti aur dast|ulti dast)(?=$|\P{L})/giu, 'vomiting and diarrhea / acute gastroenteritis'],
  [/(?<=^|\P{L})(?:जी मिचलाना|उल्टी जैसा लगना|jee michlana|ulti jaisa lagna)(?=$|\P{L})/giu, 'nausea'],
  [/(?<=^|\P{L})(?:चक्कर आना|सिर घूमना|chakkar aana|sir ghumna)(?=$|\P{L})/giu, 'dizziness / vertigo'],
  [/(?<=^|\P{L})(?:बहुत ज्यादा कमजोरी|कमजोरी|bahut zyada kamzori|kamzori|thakan)(?=$|\P{L})/giu, 'general fatigue and physical weakness'],
  [/(?<=^|\P{L})(?:भूख न लगना|खाना अच्छा न लगना|bhookh na lagna)(?=$|\P{L})/giu, 'loss of appetite / anorexia'],

  // Clinical Investigations & Diagnosis
  [/(?<=^|\P{L})(?:खून की जांच|khoon ki jaanch|blood test)(?=$|\P{L})/giu, 'complete blood count (CBC) test'],
  [/(?<=^|\P{L})(?:मलेरिया की जांच|malaria jaanch)(?=$|\P{L})/giu, 'malaria rapid diagnostic test'],
  [/(?<=^|\P{L})(?:डेंगू की जांच|dengue jaanch)(?=$|\P{L})/giu, 'dengue NS1 / IgM test'],
  [/(?<=^|\P{L})(?:टायफाइड की जांच|typhoid jaanch|widal test)(?=$|\P{L})/giu, 'Widal / Typhoid serology test'],
  [/(?<=^|\P{L})(?:मूत्र जांच|peshab ki jaanch)(?=$|\P{L})/giu, 'urine routine analysis'],
  [/(?<=^|\P{L})(?:तापमान|शरीर का तापमान|tapman|shareer ka tapman)(?=$|\P{L})/giu, 'body temperature'],
  [/(?<=^|\P{L})(?:फारेनहाइट|fahrenheit)(?=$|\P{L})/giu, 'Fahrenheit'],
  [/(?<=^|\P{L})(?:डिग्री|degree)(?=$|\P{L})/giu, 'degrees']
];

// Single word replacements for Hindi
const HINDI_WORDS: [RegExp, string][] = [
  [/(?<=^|\P{L})(?:मरीज|मरीज़|mareez|mariz|rogi)(?=$|\P{L})/giu, 'patient'],
  [/(?<=^|\P{L})(?:डॉक्टर|doctor|dr)(?=$|\P{L})/giu, 'physician'],
  [/(?<=^|\P{L})(?:बुखार|bukhar|tap)(?=$|\P{L})/giu, 'fever'],
  [/(?<=^|\P{L})(?:खांसी|khansi|khasi)(?=$|\P{L})/giu, 'cough'],
  [/(?<=^|\P{L})(?:जुकाम|jukam|zukam)(?=$|\P{L})/giu, 'cold / rhinitis'],
  [/(?<=^|\P{L})(?:उल्टी|ulti|vaman)(?=$|\P{L})/giu, 'vomiting'],
  [/(?<=^|\P{L})(?:दस्त|dast)(?=$|\P{L})/giu, 'loose stools / diarrhea'],
  [/(?<=^|\P{L})(?:दर्द|dard)(?=$|\P{L})/giu, 'pain'],
  [/(?<=^|\P{L})(?:चक्कर|chakkar)(?=$|\P{L})/giu, 'vertigo'],
  [/(?<=^|\P{L})(?:सूजन|soojan|sujan)(?=$|\P{L})/giu, 'swelling / edema'],
  [/(?<=^|\P{L})(?:दवा|दवाई|dawa|dawai|davai|aushadhi)(?=$|\P{L})/giu, 'medication'],
  [/(?<=^|\P{L})(?:गोली|goli|tab)(?=$|\P{L})/giu, 'tablet'],
  [/(?<=^|\P{L})(?:सिरप|syrup)(?=$|\P{L})/giu, 'syrup'],
  [/(?<=^|\P{L})(?:कैप्सूल|capsule)(?=$|\P{L})/giu, 'capsule'],
  [/(?<=^|\P{L})(?:सुई|इंजेक्शन|injection|sui)(?=$|\P{L})/giu, 'injection'],
  [/(?<=^|\P{L})(?:जांच|jaanch)(?=$|\P{L})/giu, 'diagnostic test'],
  [/(?<=^|\P{L})(?:पानी|paani|pani)(?=$|\P{L})/giu, 'water'],
  [/(?<=^|\P{L})(?:खाना|khana)(?=$|\P{L})/giu, 'food / meal'],
  [/(?<=^|\P{L})(?:आराम|aaram|vishram)(?=$|\P{L})/giu, 'rest'],
  [/(?<=^|\P{L})(?:दिन|din)(?=$|\P{L})/giu, 'day(s)'],
  [/(?<=^|\P{L})(?:रात|raat)(?=$|\P{L})/giu, 'night'],
  [/(?<=^|\P{L})(?:सुबह|subah)(?=$|\P{L})/giu, 'morning'],
  [/(?<=^|\P{L})(?:शाम|shaam)(?=$|\P{L})/giu, 'evening'],
  [/(?<=^|\P{L})(?:दोपहर|dopahar)(?=$|\P{L})/giu, 'afternoon'],
  [/(?<=^|\P{L})(?:हल्का|halka)(?=$|\P{L})/giu, 'mild'],
  [/(?<=^|\P{L})(?:तेज|गंभीर|tez|gambhir)(?=$|\P{L})/giu, 'severe'],
  [/(?<=^|\P{L})(?:बहुत|bahut)(?=$|\P{L})/giu, 'marked'],
  [/(?<=^|\P{L})(?:कम|kam)(?=$|\P{L})/giu, 'low / minimal'],
  [/(?<=^|\P{L})(?:ज्यादा|zyada|jyada)(?=$|\P{L})/giu, 'high / intense'],

  // Auxiliary and connective verbs (convert to clean English)
  [/(?<=^|\P{L})(?:को|ko)(?=$|\P{L})/giu, 'has'],
  [/(?<=^|\P{L})(?:है|हैं|hai|hain)(?=$|\P{L})/giu, 'is present'],
  [/(?<=^|\P{L})(?:था|थी|थे|tha|thi|the)(?=$|\P{L})/giu, 'was present'],
  [/(?<=^|\P{L})(?:और|aur|tatha)(?=$|\P{L})/giu, 'and'],
  [/(?<=^|\P{L})(?:भी|bhi)(?=$|\P{L})/giu, 'also'],
  [/(?<=^|\P{L})(?:में|me|mein)(?=$|\P{L})/giu, 'in'],
  [/(?<=^|\P{L})(?:से|se)(?=$|\P{L})/giu, 'since / with'],
  [/(?<=^|\P{L})(?:का|की|के|ka|ki|ke)(?=$|\P{L})/giu, 'of'],
  [/(?<=^|\P{L})(?:लेना|लें|लीजिए|लेने|lena|lein|lijiye|lo)(?=$|\P{L})/giu, 'prescribed to take'],
  [/(?<=^|\P{L})(?:दीजिए|देना|दी|dijiye|dena)(?=$|\P{L})/giu, 'administered'],
  [/(?<=^|\P{L})(?:आ रहा है|आ रही है|aa raha hai|aa rahi hai)(?=$|\P{L})/giu, 'persisting'],
  [/(?<=^|\P{L})(?:हो रहा है|हो रही है|ho raha hai|ho rahi hai)(?=$|\P{L})/giu, 'reported'],
  [/(?<=^|\P{L})(?:लग रहा है|lag raha hai)(?=$|\P{L})/giu, 'presenting with'],
  [/(?<=^|\P{L})(?:सलाह दी गई|सलाह दी|salah di gayi)(?=$|\P{L})/giu, 'advised'],
  [/(?<=^|\P{L})(?:कहा गया|kaha gaya)(?=$|\P{L})/giu, 'instructed']
];

// Multi-word phrase mappings for Tamil (Tamil Script & Tanglish)
const TAMIL_PHRASES: [RegExp, string][] = [
  // Prescriptions & Timings
  [/(?<=^|\P{L})(?:காலை இரவு|kaalai iravu|kaalai matrum iravu)(?=$|\P{L})/giu, 'morning and night twice daily (BID)'],
  [/(?<=^|\P{L})(?:காலை மதியம் இரவு|kaalai mathiyam iravu)(?=$|\P{L})/giu, 'thrice daily morning, afternoon and night (TID)'],
  [/(?<=^|\P{L})(?:உணவுக்குப் பின்|உணவுக்கு பின்|சாப்பாட்டுக்கு பின்|unavukku pin|sappattukku pin)(?=$|\P{L})/giu, 'after meals (post-prandial)'],
  [/(?<=^|\P{L})(?:உணவுக்கு முன்|சாப்பாட்டுக்கு முன்|வெறும் வயிற்றில்|unavukku mun|sappattukku mun|verum vayitril)(?=$|\P{L})/giu, 'before meals / on empty stomach (ante-prandial)'],
  [/(?<=^|\P{L})(?:இரவு தூங்கும் முன்|தூங்கும் போது|iravu thoongum mun|thoongum bothu)(?=$|\P{L})/giu, 'at bedtime (HS)'],
  [/(?<=^|\P{L})(?:வெந்நீரில்|சூடு தண்ணீரில்|venneeril|sudu thanniyil)(?=$|\P{L})/giu, 'with warm water'],
  [/(?<=^|\P{L})(?:நிறைய தண்ணீர் குடிக்கவும்|தண்ணீர் அதிகம் குடிக்க|thanneer adhigam kudikka|niraiya thanneer kudikka)(?=$|\P{L})/giu, 'maintain adequate oral fluid hydration'],
  [/(?<=^|\P{L})(?:முழு ஓய்வு எடுக்கவும்|ஓய்வு தேவை|muzhu oyvu edukka|oyvu thevai|rest edukka)(?=$|\P{L})/giu, 'advised complete bed rest'],
  [/(?<=^|\P{L})(?:3 நாட்களுக்கு|3 நாட்களாக|3 naatkalukku|3 naatkalaga|moonru naatkal)(?=$|\P{L})/giu, 'for 3 days'],
  [/(?<=^|\P{L})(?:5 நாட்களுக்கு|5 நாட்களாக|5 naatkalukku|5 naatkalaga|aindhu naatkal)(?=$|\P{L})/giu, 'for 5 days'],
  [/(?<=^|\P{L})(?:7 நாட்களுக்கு|7 naatkalukku|ezhu naatkal)(?=$|\P{L})/giu, 'for 7 days'],
  [/(?<=^|\P{L})(?:2 நாட்களுக்கு|2 நாட்களாக|2 naatkalukku|2 naatkalaga|irandu naatkal)(?=$|\P{L})/giu, 'for 2 days'],
  [/(?<=^|\P{L})(?:நேற்றிலிருந்து|nettrilirundhu)(?=$|\P{L})/giu, 'since yesterday'],
  [/(?<=^|\P{L})(?:இன்று காலையிலிருந்து|indru kaalaiyilirundhu)(?=$|\P{L})/giu, 'since this morning'],

  // Symptoms
  [/(?<=^|\P{L})(?:கடுமையான காய்ச்சல்|அதிக காய்ச்சல்|kadumaiyana kaichal|adheega kaichal|periya kaichal)(?=$|\P{L})/giu, 'severe high-grade fever'],
  [/(?<=^|\P{L})(?:லேசான காய்ச்சல்|lesana kaichal|sirithey kaichal)(?=$|\P{L})/giu, 'mild low-grade fever'],
  [/(?<=^|\P{L})(?:கடுமையான தலைவலி|kadumaiyana thalaivali)(?=$|\P{L})/giu, 'severe acute headache'],
  [/(?<=^|\P{L})(?:தலைவலி|தலை வலி|thalaivali|thalai vali)(?=$|\P{L})/giu, 'headache'],
  [/(?<=^|\P{L})(?:உடல் வலி|உடம்பு வலி|udal vali|udambu vali)(?=$|\P{L})/giu, 'generalized body ache and myalgia'],
  [/(?<=^|\P{L})(?:தொண்டை வலி|தொண்டை எரிச்சல்|thondai vali|thondai erichal)(?=$|\P{L})/giu, 'sore throat and throat pain'],
  [/(?<=^|\P{L})(?:வறட்டு இருமல்|varattu irumal)(?=$|\P{L})/giu, 'dry persistent cough'],
  [/(?<=^|\P{L})(?:சளி மற்றும் இருமல்|sali matrum irumal)(?=$|\P{L})/giu, 'cold and productive cough'],
  [/(?<=^|\P{L})(?:குளிர் நடுக்கம்|குளிர்|kulir nadukkam|kulir)(?=$|\P{L})/giu, 'fever with chills and rigors'],
  [/(?<=^|\P{L})(?:வாந்தி மற்றும் குமட்டல்|vaanthi matrum kumattal)(?=$|\P{L})/giu, 'nausea and vomiting'],
  [/(?<=^|\P{L})(?:வயிற்று வலி|வயிறு வலி|vayitru vali|vayi vali)(?=$|\P{L})/giu, 'abdominal / stomach pain'],
  [/(?<=^|\P{L})(?:நெஞ்சு வலி|nenju vali)(?=$|\P{L})/giu, 'chest pain'],
  [/(?<=^|\P{L})(?:மூச்சுத் திணறல்|மூச்சு விட கஷ்டம்|moochu thinarel|moochu vida kashtam)(?=$|\P{L})/giu, 'shortness of breath / dyspnea'],
  [/(?<=^|\P{L})(?:மயக்கம் வருவது போல்|மயக்கம்|mayakkam varuvathu pol|mayakkam)(?=$|\P{L})/giu, 'dizziness and syncope'],
  [/(?<=^|\P{L})(?:அதிக சோர்வு|உடல் சோர்வு|ayarchi|udal sorvu)(?=$|\P{L})/giu, 'extreme weakness and fatigue']
];

// Single word replacements for Tamil
const TAMIL_WORDS: [RegExp, string][] = [
  [/(?<=^|\P{L})(?:நோயாளி|நோயாளிக்கு|noyali|patient)(?=$|\P{L})/giu, 'patient'],
  [/(?<=^|\P{L})(?:மருத்துவர்|maruthuvar|doctor)(?=$|\P{L})/giu, 'physician'],
  [/(?<=^|\P{L})(?:காய்ச்சல்|kaichal|kaychal)(?=$|\P{L})/giu, 'fever'],
  [/(?<=^|\P{L})(?:இருமல்|irumal)(?=$|\P{L})/giu, 'cough'],
  [/(?<=^|\P{L})(?:சளி|sali|chali)(?=$|\P{L})/giu, 'cold / congestion'],
  [/(?<=^|\P{L})(?:வாந்தி|vaanthi)(?=$|\P{L})/giu, 'vomiting'],
  [/(?<=^|\P{L})(?:குமட்டல்|kumattal)(?=$|\P{L})/giu, 'nausea'],
  [/(?<=^|\P{L})(?:வலி|vali)(?=$|\P{L})/giu, 'pain'],
  [/(?<=^|\P{L})(?:மாத்திரை|maathirai|tab)(?=$|\P{L})/giu, 'tablet'],
  [/(?<=^|\P{L})(?:மருந்து|marunthu)(?=$|\P{L})/giu, 'medication'],
  [/(?<=^|\P{L})(?:சாப்பாடு|saappadu)(?=$|\P{L})/giu, 'food / meal'],
  [/(?<=^|\P{L})(?:தண்ணீர்|thanneer)(?=$|\P{L})/giu, 'water'],
  [/(?<=^|\P{L})(?:ஓய்வு|oyvu)(?=$|\P{L})/giu, 'rest'],
  [/(?<=^|\P{L})(?:நாட்கள்|naatkal)(?=$|\P{L})/giu, 'days'],
  [/(?<=^|\P{L})(?:காலை|kaalai)(?=$|\P{L})/giu, 'morning'],
  [/(?<=^|\P{L})(?:இரவு|iravu)(?=$|\P{L})/giu, 'night'],
  [/(?<=^|\P{L})(?:மதியம்|mathiyam)(?=$|\P{L})/giu, 'afternoon'],
  [/(?<=^|\P{L})(?:லேசான|lesana)(?=$|\P{L})/giu, 'mild'],
  [/(?<=^|\P{L})(?:கடுமையான|kadumaiyana)(?=$|\P{L})/giu, 'severe'],
  [/(?<=^|\P{L})(?:அதிக|அதிகமாக|adheega)(?=$|\P{L})/giu, 'high / marked'],

  // Grammar & connectors
  [/(?<=^|\P{L})(?:உள்ளது|இருக்கிறது|ullathu|irukku|irukkirathu)(?=$|\P{L})/giu, 'is present'],
  [/(?<=^|\P{L})(?:இல்லை|illai)(?=$|\P{L})/giu, 'is absent'],
  [/(?<=^|\P{L})(?:மற்றும்|matrum)(?=$|\P{L})/giu, 'and'],
  [/(?<=^|\P{L})(?:தேவை|thevai)(?=$|\P{L})/giu, 'required'],
  [/(?<=^|\P{L})(?:சாப்பிடவும்|எடுக்கவும்|saapidavum|edukkavum)(?=$|\P{L})/giu, 'prescribed to take'],
  [/(?<=^|\P{L})(?:குடிக்கவும்|kudikkavum)(?=$|\P{L})/giu, 'drink'],
  [/(?<=^|\P{L})(?:சொல்லப்பட்டது|sollappattathu)(?=$|\P{L})/giu, 'instructed']
];

/**
 * High-speed offline dictionary translation (Instant fallback & streaming support)
 */
export function translateToEnglishSync(
  rawText: string,
  forcedLang?: 'English' | 'Hindi' | 'Tamil' | 'Telugu' | 'Bengali' | 'Auto Detect'
): TranslationResult {
  if (!rawText || !rawText.trim()) {
    return {
      translatedText: '',
      detectedLang: 'English',
      detectedLangNative: 'English',
      isTranslated: false,
      prescriptions: []
    };
  }

  const detected = forcedLang && forcedLang !== 'Auto Detect' ? forcedLang : detectLanguage(rawText);
  let translated = rawText;
  let isTranslated = false;

  if (detected === 'Hindi') {
    isTranslated = true;
    for (const [regex, replacement] of HINDI_PHRASES) {
      translated = translated.replace(regex, replacement);
    }
    for (const [regex, replacement] of HINDI_WORDS) {
      translated = translated.replace(regex, replacement);
    }
  } else if (detected === 'Tamil') {
    isTranslated = true;
    for (const [regex, replacement] of TAMIL_PHRASES) {
      translated = translated.replace(regex, replacement);
    }
    for (const [regex, replacement] of TAMIL_WORDS) {
      translated = translated.replace(regex, replacement);
    }
  }

  // General formatting cleanup
  translated = translated
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([.,;:])/g, '$1')
    .trim();

  // Ensure first letter capitalized
  if (translated.length > 0) {
    translated = translated.charAt(0).toUpperCase() + translated.slice(1);
  }

  const prescriptions = extractPrescriptions(translated);
  const nativeLabels: Record<string, string> = {
    English: 'English (UK/IN)',
    Hindi: 'हिन्दी (Hindi)',
    Tamil: 'தமிழ் (Tamil)',
    Telugu: 'తెలుగు (Telugu)',
    Bengali: 'বাংলা (Bengali)',
    Other: 'Auto Detect'
  };

  return {
    translatedText: translated,
    detectedLang: detected,
    detectedLangNative: nativeLabels[detected] || detected,
    isTranslated: isTranslated && translated !== rawText,
    prescriptions
  };
}

/**
 * Asynchronous Neural Translation API
 * Calls MyMemory translation API or local engine to deliver publication-grade clinical English
 */
export async function translateToEnglishAsync(
  rawText: string,
  forcedLang?: 'English' | 'Hindi' | 'Tamil' | 'Telugu' | 'Bengali' | 'Auto Detect'
): Promise<TranslationResult> {
  if (!rawText || !rawText.trim()) {
    return translateToEnglishSync(rawText, forcedLang);
  }

  const detected = forcedLang && forcedLang !== 'Auto Detect' ? forcedLang : detectLanguage(rawText);
  if (detected === 'English') {
    return translateToEnglishSync(rawText, 'English');
  }

  const cacheKey = `${detected}:${rawText.trim()}`;
  if (translationCache.has(cacheKey)) {
    const cached = translationCache.get(cacheKey)!;
    return {
      translatedText: cached,
      detectedLang: detected,
      detectedLangNative: detected === 'Hindi' ? 'हिन्दी (Hindi)' : detected === 'Tamil' ? 'தமிழ் (Tamil)' : detected,
      isTranslated: true,
      prescriptions: extractPrescriptions(cached)
    };
  }

  // Determine language code pair for API
  let langPair = 'hi|en';
  if (detected === 'Tamil') langPair = 'ta|en';
  else if (detected === 'Telugu') langPair = 'te|en';
  else if (detected === 'Bengali') langPair = 'bn|en';
  else if (detected === 'Hindi') langPair = 'hi|en';
  else langPair = 'autodetect|en';

  try {
    // Call MyMemory Neural Translation API
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const apiUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(rawText.trim())}&langpair=${langPair}`;
    const response = await fetch(apiUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      let neuralText = data?.responseData?.translatedText;

      // Check if translation succeeded and isn't just an echo of the original untranslated text
      if (neuralText && typeof neuralText === 'string' && neuralText.trim() && neuralText.trim().toLowerCase() !== rawText.trim().toLowerCase()) {
        // Standardize clinical dosages and common medical names
        neuralText = standardizeClinicalEnglish(neuralText);
        translationCache.set(cacheKey, neuralText);

        return {
          translatedText: neuralText,
          detectedLang: detected,
          detectedLangNative: detected === 'Hindi' ? 'हिन्दी (Hindi)' : detected === 'Tamil' ? 'தமிழ் (Tamil)' : detected,
          isTranslated: true,
          prescriptions: extractPrescriptions(neuralText)
        };
      }
    }
  } catch (err) {
    console.warn('Neural translation API failed or timed out, falling back to comprehensive dictionary:', err);
  }

  // Fallback to our extensive dictionary translator
  const fallbackResult = translateToEnglishSync(rawText, detected === 'Other' ? 'Auto Detect' : detected);
  if (fallbackResult.translatedText) {
    translationCache.set(cacheKey, fallbackResult.translatedText);
  }
  return fallbackResult;
}

/**
 * Standardize clinical dosages and common medical terms in translated English
 */
function standardizeClinicalEnglish(text: string): string {
  let cleaned = text
    .replace(/\bdolo\s*650\b/gi, 'Dolo 650mg')
    .replace(/\bparacetamol\s*650\b/gi, 'Paracetamol 650mg')
    .replace(/\bcetirizine\s*10\b/gi, 'Cetirizine 10mg')
    .replace(/\bazithromycin\s*500\b/gi, 'Azithromycin 500mg')
    .replace(/\bamoxicillin\s*500\b/gi, 'Amoxicillin 500mg')
    .replace(/\bpantoprazole\s*40\b/gi, 'Pantoprazole 40mg')
    .replace(/\btwo times a day\b/gi, 'twice daily (BID)')
    .replace(/\bthree times a day\b/gi, 'three times daily (TID)')
    .replace(/\bonce a day\b/gi, 'once daily (OD)')
    .replace(/\bafter eating\b/gi, 'after meals')
    .replace(/\bempty stomach\b/gi, 'on an empty stomach')
    .replace(/\s{2,}/g, ' ')
    .trim();

  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }
  return cleaned;
}

/**
 * Extract identified medications from clinical text
 */
function extractPrescriptions(text: string): string[] {
  const prescriptions: string[] = [];
  const medMatches = text.match(
    /\b(?:Paracetamol(?:\s*650mg)?|Crocin|Dolo(?:\s*650mg)?|Ibuprofen(?:\s*400mg)?|Cetirizine(?:\s*10mg)?|Azithromycin(?:\s*500mg)?|Amoxicillin(?:\s*500mg)?|Pantoprazole(?:\s*40mg)?|ORS|Cough Syrup|Montelukast|Ranitidine)\b[^\.\n,]*/gi
  );
  if (medMatches) {
    medMatches.forEach(m => {
      const clean = m.trim();
      if (!prescriptions.includes(clean)) {
        prescriptions.push(clean);
      }
    });
  }
  return prescriptions;
}

/**
 * Backward-compatible synchronous wrapper
 */
export function translateToEnglish(
  rawText: string,
  forcedLang?: 'English' | 'Hindi' | 'Tamil' | 'Telugu' | 'Bengali' | 'Auto Detect'
): TranslationResult {
  return translateToEnglishSync(rawText, forcedLang);
}

/**
 * Rates the severity of extracted symptoms ("who is more or less")
 * Assigns a score (1 to 10) and severity category ('Severe' | 'Moderate' | 'Mild')
 * Sorts them in descending order of severity so the primary concern is ranked #1.
 */
export function calculateSymptomSeverities(symptoms: string[], fullText: string): SymptomSeverity[] {
  const textLower = fullText.toLowerCase();

  return symptoms
    .filter(s => s && s !== 'None detected')
    .map(symptom => {
      const symLower = symptom.toLowerCase();
      let severity: 'Severe' | 'Moderate' | 'Mild' = 'Moderate';
      let score = 5;
      let detectedCue = 'Standard presentation';

      // Check for High / Severe indicators (score 8-10)
      const severeCues = [
        'severe', 'acute', 'high', 'extreme', 'unbearable', 'intense', 'terrible',
        '103', '104', '102.5', 'high-grade', 'continuous', 'fever with chills',
        'tez', 'bahut jyada', 'bahut zyada', 'gambhir', 'kadumaiyana', 'adheega'
      ];
      // Check for Mild indicators (score 1-4)
      const mildCues = [
        'mild', 'slight', 'little', 'occasional', 'low-grade', 'subtle', 'tolerable',
        'halka', 'thoda', 'kam', 'lesana', 'sirithey'
      ];
      // Check for Moderate indicators (score 5-7)
      const moderateCues = [
        'moderate', 'steady', 'intermittent', 'persistent', 'darmiyana', 'madhyam', 'mithamana'
      ];

      // Context window around symptom
      const symIndex = textLower.indexOf(symLower);
      const context = symIndex !== -1 ? textLower.substring(Math.max(0, symIndex - 40), Math.min(textLower.length, symIndex + 60)) : textLower;

      const hasSevereCue = severeCues.some(c => context.includes(c));
      const hasMildCue = mildCues.some(c => context.includes(c));
      const hasModerateCue = moderateCues.some(c => context.includes(c));

      // Specific conditions with inherent clinical severity weighting
      if (symLower.includes('chest pain') || symLower.includes('shortness of breath')) {
        severity = 'Severe';
        score = 9;
        detectedCue = 'High clinical risk entity';
      } else if (hasSevereCue || context.includes('103') || context.includes('104')) {
        severity = 'Severe';
        score = symLower.includes('fever') ? 9 : 8;
        detectedCue = 'Marked as high/severe in speech';
      } else if (hasMildCue) {
        severity = 'Mild';
        score = 2;
        detectedCue = 'Marked as mild/slight in speech';
      } else if (hasModerateCue) {
        severity = 'Moderate';
        score = 6;
        detectedCue = 'Marked as moderate';
      } else {
        // Default baseline heuristic
        if (symLower.includes('fever')) {
          severity = 'Severe';
          score = 8;
          detectedCue = 'Acute febrile symptom';
        } else if (symLower.includes('body pain')) {
          severity = 'Moderate';
          score = 7;
          detectedCue = 'Systemic discomfort';
        } else if (symLower.includes('headache')) {
          severity = 'Moderate';
          score = 6;
          detectedCue = 'Secondary complaint';
        } else if (symLower.includes('cough') || symLower.includes('cold') || symLower.includes('sore throat')) {
          severity = 'Mild';
          score = 3;
          detectedCue = 'Upper respiratory symptom';
        } else {
          severity = 'Moderate';
          score = 5;
        }
      }

      return {
        symptom,
        severity,
        score,
        detectedCue
      };
    })
    // Sort descending by score ("who is more or less")
    .sort((a, b) => b.score - a.score);
}

// Sample Multilingual Consultation Presets for instant testing
export interface DemoPreset {
  id: string;
  lang: 'English' | 'Hindi' | 'Tamil' | 'Telugu' | 'Bengali';
  title: string;
  description: string;
  spokenTranscript: string;
}

export const DEMO_PRESETS: DemoPreset[] = [
  {
    id: 'hi-1',
    lang: 'Hindi',
    title: '🇮🇳 Hindi: Acute Fever & Prescription (तेज बुखार और दवा)',
    description: 'Patient with 3-day severe fever, body ache, 103°F temp, prescribed Paracetamol & Dolo',
    spokenTranscript: 'मरीज को 3 दिन से तेज बुखार और बहुत ज्यादा बदन दर्द है। तापमान 103 फारेनहाइट है और सिरदर्द भी है। डॉक्टर ने पैरासिटामोल 650mg दिन में दो बार खाना खाने के बाद और डोलो लेने की सलाह दी है।'
  },
  {
    id: 'hi-2',
    lang: 'Hindi',
    title: '🇮🇳 Hindi: Abdominal Pain & Dizziness (पेट दर्द और उल्टी)',
    description: 'Patient reports severe abdominal pain, vomiting, and dizziness since yesterday',
    spokenTranscript: 'मरीज को पिछले कल से गंभीर पेट दर्द और उल्टी की शिकायत है। चक्कर भी आ रहे हैं। कमजोरी बहुत ज्यादा है। ओआरएस घोल और पैंटोप्राजोल खाली पेट सुबह लेने को कहा गया है।'
  },
  {
    id: 'ta-1',
    lang: 'Tamil',
    title: '🇮🇳 Tamil: Severe Fever & Body Pain (கடுமையான காய்ச்சல்)',
    description: 'Patient has severe fever for 2 days, body ache, 102.5°F, prescribed Paracetamol & rest',
    spokenTranscript: 'நோயாளிக்கு கடந்த 2 நாட்களாக கடுமையான காய்ச்சல் மற்றும் தலைவலி உள்ளது. உடல் வலி அதிகமாக உள்ளது மற்றும் வெப்பநிலை 102.5 Fahrenheit. பாராசிட்டமால் 650mg காலை இரவு உணவுக்குப் பின் எடுக்கவும், முழு ஓய்வு தேவை.'
  },
  {
    id: 'ta-2',
    lang: 'Tamil',
    title: '🇮🇳 Tamil: Sore Throat & Dry Cough (தொண்டை வலி & இருமல்)',
    description: 'Patient has sore throat, dry cough for 3 days, mild cold, prescribed Cetirizine',
    spokenTranscript: 'நோயாளிக்கு தொண்டை வலி மற்றும் வறட்டு இருமல் 3 நாட்களாக உள்ளது. லேசான சளி உள்ளது ஆனால் கடுமையான காய்ச்சல் இல்லை. சிட்ரிசின் மாத்திரை இரவு தூங்கும் முன் எடுக்கவும் மற்றும் வெந்நீரில் வாய் கொப்பளிக்கவும்.'
  },
  {
    id: 'te-1',
    lang: 'Telugu',
    title: '🇮🇳 Telugu: Severe Fever & Body Ache (తీవ్రమైన జ్వరం)',
    description: 'Patient reports high fever for 2 days, headache, prescribed Paracetamol 650mg BID',
    spokenTranscript: 'రోగికి 2 రోజుల నుండి తీవ్రమైన జ్వరం మరియు తలనొప్పి ఉంది. ఒంటి నొప్పులు కూడా ఎక్కువగా ఉన్నాయి. పారాసిటమాల్ 650mg టాబ్లెట్ భోజనం తర్వాత రోజుకు రెండుసార్లు తీసుకోండి.'
  },
  {
    id: 'en-1',
    lang: 'English',
    title: '🇬🇧 English: High Febrile Illness & Triage',
    description: 'Standard English consultation with acute fever, severe headache, and medication',
    spokenTranscript: 'Patient presents with severe acute fever and generalized body pain since yesterday. Recorded body temperature is 103 Fahrenheit. Prescribing Paracetamol 650mg twice daily after meals and Cetirizine at bedtime.'
  }
];
