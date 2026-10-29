-- Starting guidance: the 40 topics, the curated questions people ask
-- (with other phrasings for matching), Today's verses and three paths.
-- Clips and answers are added by curators in Curator Studio.

insert into public.topics (slug, group_slug, name_en, name_hi, sensitive, sort_order) values
  ('overthinking', 'mind', 'Overthinking', 'ज़्यादा सोचना', false, 1),
  ('worry', 'mind', 'Worry and stress', 'चिंता और तनाव', false, 2),
  ('anger', 'mind', 'Anger', 'क्रोध', false, 3),
  ('fear', 'mind', 'Fear', 'डर', false, 4),
  ('jealousy', 'mind', 'Jealousy', 'ईर्ष्या', false, 5),
  ('ego', 'mind', 'Ego', 'अहंकार', false, 6),
  ('loneliness', 'mind', 'Loneliness', 'अकेलापन', false, 7),
  ('sadness', 'mind', 'Sadness', 'उदासी', true, 8),
  ('self-worth', 'mind', 'Self-worth', 'आत्म-सम्मान', false, 9),
  ('comparison', 'mind', 'Comparing yourself to others', 'दूसरों से तुलना', false, 10),
  ('guilt', 'mind', 'Guilt and regret', 'अपराध-बोध और पछतावा', false, 11),
  ('desire', 'mind', 'Desires and cravings', 'इच्छाएँ और लालसा', false, 12),
  ('peace', 'mind', 'Peace of mind', 'मन की शांति', false, 13),
  ('parents', 'relationships', 'Parents', 'माता-पिता', true, 14),
  ('family-conflict', 'relationships', 'Family conflict', 'परिवार में कलह', true, 15),
  ('marriage', 'relationships', 'Marriage', 'विवाह', false, 16),
  ('heartbreak', 'relationships', 'Breakup and heartbreak', 'ब्रेकअप और दिल का टूटना', false, 17),
  ('attachment', 'relationships', 'Love and attachment', 'प्रेम और मोह', false, 18),
  ('friendship', 'relationships', 'Friendship', 'मित्रता', false, 19),
  ('forgiveness', 'relationships', 'Forgiveness', 'क्षमा', false, 20),
  ('children', 'relationships', 'Raising children', 'बच्चों की परवरिश', false, 21),
  ('career', 'work', 'Career', 'करियर', false, 22),
  ('exams', 'work', 'Studies and exams', 'पढ़ाई और परीक्षा', false, 23),
  ('failure', 'work', 'Failure', 'असफलता', false, 24),
  ('money', 'work', 'Money', 'धन', false, 25),
  ('discipline', 'work', 'Discipline and laziness', 'अनुशासन और आलस्य', false, 26),
  ('focus', 'work', 'Focus', 'एकाग्रता', false, 27),
  ('phone', 'work', 'Phone and social media', 'फ़ोन और सोशल मीडिया', false, 28),
  ('habits', 'work', 'Bad habits and addiction', 'बुरी आदतें और नशा', false, 29),
  ('grief', 'hardship', 'Grief and loss', 'शोक', true, 30),
  ('death', 'hardship', 'Fear of death', 'मृत्यु का भय', true, 31),
  ('illness', 'hardship', 'Illness and pain', 'बीमारी और पीड़ा', false, 32),
  ('hard-times', 'hardship', 'Hard times', 'कठिन समय', false, 33),
  ('heavy-heart', 'hardship', 'When life feels too heavy', 'जब जीवन भारी लगे', true, 34),
  ('meditation', 'spirit', 'Meditation', 'ध्यान', false, 35),
  ('devotion', 'spirit', 'Devotion and prayer', 'भक्ति और प्रार्थना', false, 36),
  ('naam-jap', 'spirit', 'Naam jap', 'नाम जप', false, 37),
  ('karma', 'spirit', 'Karma and destiny', 'कर्म और भाग्य', false, 38),
  ('purpose', 'spirit', 'Purpose of life', 'जीवन का उद्देश्य', false, 39),
  ('surrender', 'spirit', 'Letting go and surrender', 'समर्पण', false, 40);

insert into public.questions (topic_id, text_en, text_hi, phrasings, sort_order)
select t.id, q.text_en, q.text_hi, q.phrasings, q.sort_order
from (values
  ('overthinking', 'How do I stop overthinking?', 'ज़्यादा सोचना कैसे बंद करूँ?',
    array['my mind never stops thinking', 'I cannot stop thinking', 'zyada sochna kaise band karu', 'dimag mein vichar chalte rehte hain'], 1),
  ('overthinking', 'Why does my mind race at night?', 'रात को मन इतना क्यों भागता है?',
    array['I cannot sleep because of my thoughts', 'thoughts keep me awake at night', 'raat ko neend nahi aati sochte sochte', 'raat ko dimag shant nahi hota'], 2),
  ('overthinking', 'How do I stop replaying the past?', 'बीती बातें बार-बार क्यों याद आती हैं?',
    array['I keep thinking about what happened', 'purani baatein yaad aati rehti hain', 'past ko bhool nahi pata'], 3),

  ('worry', 'How do I stop worrying about the future?', 'भविष्य की चिंता कैसे छोड़ूँ?',
    array['I am always anxious about what will happen', 'future ki tension', 'aage kya hoga yeh sochkar dar lagta hai'], 1),
  ('worry', 'How do I handle stress?', 'तनाव को कैसे संभालूँ?',
    array['too much stress', 'bahut tension hai', 'stress kaise kam kare'], 2),
  ('worry', 'What do I do when I feel anxious?', 'घबराहट हो तो क्या करूँ?',
    array['I feel anxious all the time', 'ghabrahat hoti hai', 'dil ghabrata hai', 'anxiety attack'], 3),

  ('anger', 'How do I control my anger?', 'अपने क्रोध पर काबू कैसे पाऊँ?',
    array['I get angry very quickly', 'gussa kaise control karein', 'mujhe bahut gussa aata hai', 'short temper'], 1),
  ('anger', 'Why do I get angry with the people I love?', 'मैं अपनों पर ही गुस्सा क्यों करता हूँ?',
    array['I shout at my family', 'gharwalon par gussa nikalta hai', 'apno par chillata hu'], 2),
  ('anger', 'How do I calm down after an argument?', 'झगड़े के बाद मन कैसे शांत करूँ?',
    array['after a fight I keep thinking about it', 'ladai ke baad gussa nahi jaata'], 3),

  ('fear', 'How do I overcome fear?', 'डर पर कैसे जीत पाऊँ?',
    array['I am scared of everything', 'dar kaise khatam kare', 'mujhe har cheez se dar lagta hai'], 1),
  ('fear', 'How do I stop being afraid of what people think?', 'लोग क्या कहेंगे, इस डर से कैसे निकलूँ?',
    array['log kya kahenge', 'I care too much about what others think', 'society ka dar'], 2),

  ('jealousy', 'How do I stop feeling jealous of others?', 'दूसरों से जलन कैसे दूर करूँ?',
    array['I feel jealous when others succeed', 'jalan hoti hai', 'doosron ki khushi se irsha hoti hai'], 1),
  ('jealousy', 'Why does someone else''s success hurt me?', 'दूसरे की सफलता मुझे क्यों चुभती है?',
    array['I cannot be happy for my friends', 'dost aage nikal gaya to bura lagta hai'], 2),

  ('ego', 'How do I let go of my ego?', 'अहंकार कैसे छोड़ूँ?',
    array['I have too much ego', 'ahankar kaise khatam ho', 'too much pride'], 1),
  ('ego', 'Why do I get hurt so easily?', 'मुझे इतनी जल्दी बुरा क्यों लगता है?',
    array['I take everything personally', 'choti baat ka bura lag jata hai'], 2),

  ('loneliness', 'How do I deal with loneliness?', 'अकेलेपन से कैसे निपटूँ?',
    array['I feel alone', 'I have no one to talk to', 'akela mehsoos karta hu', 'koi apna nahi hai'], 1),
  ('loneliness', 'Why do I feel lonely even among people?', 'लोगों के बीच भी अकेलापन क्यों लगता है?',
    array['lonely in a crowd', 'sab ke beech bhi akela lagta hai'], 2),

  ('sadness', 'What do I do when I feel sad for no reason?', 'बिना वजह उदासी हो तो क्या करूँ?',
    array['I feel low all the time', 'mann udaas rehta hai', 'kuch accha nahi lagta'], 1),
  ('sadness', 'How do I find joy again?', 'फिर से खुश कैसे रहूँ?',
    array['I have lost interest in everything', 'khushi kaise wapas aaye', 'zindagi mein maza nahi raha'], 2),

  ('self-worth', 'How do I stop feeling not good enough?', 'मैं किसी लायक नहीं, यह भावना कैसे जाए?',
    array['I feel worthless', 'mujhme koi kami hai', 'low self esteem', 'main kuch nahi kar sakta'], 1),
  ('self-worth', 'How do I build confidence?', 'आत्मविश्वास कैसे बढ़ाऊँ?',
    array['I have no confidence', 'confidence kaise badhaye', 'atmavishwas ki kami'], 2),

  ('comparison', 'How do I stop comparing myself to others?', 'दूसरों से अपनी तुलना करना कैसे छोड़ूँ?',
    array['everyone is ahead of me', 'sabse compare karta hu', 'instagram dekh ke bura lagta hai'], 1),
  ('comparison', 'Why do I never feel I have enough?', 'मुझे कभी संतोष क्यों नहीं होता?',
    array['I always want more', 'santosh nahi hota'], 2),

  ('guilt', 'How do I forgive myself for a mistake?', 'अपनी गलती के लिए खुद को कैसे माफ़ करूँ?',
    array['I cannot forgive myself', 'guilt nahi jaata', 'maine bahut badi galti ki'], 1),
  ('guilt', 'How do I live with regret?', 'पछतावे के साथ कैसे जियूँ?',
    array['I regret my decisions', 'pachtava hota hai', 'kaash maine aisa na kiya hota'], 2),

  ('desire', 'How do I control my desires?', 'इच्छाओं पर नियंत्रण कैसे रखूँ?',
    array['too many desires', 'ichhaon par control', 'mann bhatakta hai'], 1),
  ('desire', 'How do I deal with lust?', 'काम-वासना से कैसे बचूँ?',
    array['lustful thoughts', 'vasna ke vichar', 'gande vichar aate hain'], 2),

  ('peace', 'How do I find peace of mind?', 'मन की शांति कैसे पाऊँ?',
    array['I want inner peace', 'mann shant kaise kare', 'sukoon nahi hai'], 1),
  ('peace', 'How do I stay calm in every situation?', 'हर हाल में शांत कैसे रहूँ?',
    array['stay calm under pressure', 'har situation mein shant rehna'], 2),

  ('parents', 'My parents don''t understand me. What do I do?', 'माता-पिता मुझे नहीं समझते, क्या करूँ?',
    array['my parents do not support me', 'mummy papa samajhte nahi', 'ghar wale meri baat nahi maante'], 1),
  ('parents', 'How do I serve my parents without losing myself?', 'अपने को खोए बिना माता-पिता की सेवा कैसे करूँ?',
    array['duty towards parents', 'mata pita ki seva'], 2),
  ('parents', 'How do I handle my parents'' pressure about marriage or career?', 'शादी या करियर को लेकर घरवालों का दबाव कैसे संभालूँ?',
    array['my parents are forcing me', 'ghar walon ka pressure'], 3),

  ('family-conflict', 'How do I stay calm when my family argues?', 'घर में झगड़े हों तो शांत कैसे रहूँ?',
    array['fights at home', 'ghar mein roz ladai hoti hai', 'family mein kalesh'], 1),
  ('family-conflict', 'How do I deal with relatives who hurt me?', 'जो रिश्तेदार दुख देते हैं, उनसे कैसे निपटूँ?',
    array['toxic relatives', 'rishtedar taane maarte hain'], 2),

  ('marriage', 'How do I keep my marriage happy?', 'वैवाहिक जीवन सुखी कैसे रखूँ?',
    array['problems with my husband', 'problems with my wife', 'pati patni mein ladai'], 1),
  ('marriage', 'How do I know whom to marry?', 'किससे विवाह करूँ, यह कैसे जानूँ?',
    array['choosing a life partner', 'shaadi kisse karu'], 2),
  ('marriage', 'What do I do when my spouse and I keep fighting?', 'पति-पत्नी में बार-बार झगड़ा हो तो क्या करें?',
    array['we fight every day', 'har din jhagda hota hai'], 3),

  ('heartbreak', 'How do I get over a breakup?', 'ब्रेकअप से कैसे उबरूँ?',
    array['my relationship ended', 'breakup ke baad kya kare', 'usko bhool nahi pa raha'], 1),
  ('heartbreak', 'How do I stop thinking about someone who left?', 'जो चला गया, उसके बारे में सोचना कैसे बंद करूँ?',
    array['she left me', 'he left me', 'uski yaad aati hai'], 2),

  ('attachment', 'How do I love without attachment?', 'मोह के बिना प्रेम कैसे करूँ?',
    array['too attached to someone', 'moh kaise chhode', 'attachment'], 1),
  ('attachment', 'Is it wrong to expect things from people I love?', 'अपनों से उम्मीद रखना गलत है क्या?',
    array['expectations hurt me', 'ummeed toot jaati hai'], 2),

  ('friendship', 'How do I find true friends?', 'सच्चे मित्र कैसे मिलें?',
    array['I have no real friends', 'sacche dost nahi hain'], 1),
  ('friendship', 'What do I do when a friend betrays me?', 'दोस्त धोखा दे तो क्या करूँ?',
    array['my friend cheated me', 'dost ne dhokha diya'], 2),

  ('forgiveness', 'How do I forgive someone who hurt me?', 'जिसने दुख दिया, उसे माफ़ कैसे करूँ?',
    array['I cannot forgive them', 'maaf karna mushkil hai', 'badla lena chahta hu'], 1),
  ('forgiveness', 'Does forgiving mean forgetting?', 'क्या माफ़ करने का मतलब भूल जाना है?',
    array['forgive and forget'], 2),

  ('children', 'How do I raise good children?', 'बच्चों को अच्छे संस्कार कैसे दूँ?',
    array['parenting', 'bacchon ko sanskar', 'good values for kids'], 1),
  ('children', 'How do I handle a child who doesn''t listen?', 'बच्चा बात न माने तो क्या करूँ?',
    array['my child is stubborn', 'baccha baat nahi sunta', 'kids on mobile all day'], 2),

  ('career', 'How do I choose the right career?', 'सही करियर कैसे चुनूँ?',
    array['confused about my career', 'career choice', 'life mein kya karu'], 1),
  ('career', 'How do I find meaning in my work?', 'अपने काम में अर्थ कैसे पाऊँ?',
    array['I hate my job', 'job mein mann nahi lagta'], 2),
  ('career', 'How do I handle pressure at work?', 'काम का दबाव कैसे संभालूँ?',
    array['work stress', 'boss pressure', 'office tension'], 3),

  ('exams', 'How do I stay calm before exams?', 'परीक्षा से पहले घबराहट कैसे दूर करूँ?',
    array['exam fear', 'exam ka dar', 'board exam stress'], 1),
  ('exams', 'How do I concentrate on my studies?', 'पढ़ाई में मन कैसे लगाऊँ?',
    array['I cannot focus on studies', 'padhai mein mann nahi lagta'], 2),
  ('exams', 'What if I fail my exam?', 'परीक्षा में फेल हो गया तो?',
    array['I failed my exam', 'result kharab aaya', 'competitive exam nahi nikla'], 3),

  ('failure', 'How do I deal with failure?', 'असफलता को कैसे स्वीकार करूँ?',
    array['I failed again', 'baar baar fail ho raha hu', 'nakami'], 1),
  ('failure', 'How do I keep going when nothing works out?', 'जब कुछ भी ठीक न हो, तब हिम्मत कैसे रखूँ?',
    array['nothing is working', 'kuch theek nahi ho raha', 'himmat toot gayi'], 2),

  ('money', 'How do I stop worrying about money?', 'पैसों की चिंता कैसे छोड़ूँ?',
    array['financial stress', 'paise ki tension', 'karz ki chinta'], 1),
  ('money', 'Is it wrong to want to be rich?', 'क्या अमीर बनना चाहना गलत है?',
    array['money and spirituality', 'paisa kamana galat hai kya'], 2),

  ('discipline', 'How do I become disciplined?', 'जीवन में अनुशासन कैसे लाऊँ?',
    array['I have no discipline', 'routine follow nahi hota', 'discipline kaise laye'], 1),
  ('discipline', 'How do I stop being lazy?', 'आलस्य कैसे दूर करूँ?',
    array['I am very lazy', 'aalas bahut aata hai', 'procrastination'], 2),
  ('discipline', 'How do I wake up early?', 'सुबह जल्दी कैसे उठूँ?',
    array['I cannot wake up early', 'subah jaldi uthna', 'brahma muhurat'], 3),

  ('focus', 'How do I improve my concentration?', 'एकाग्रता कैसे बढ़ाऊँ?',
    array['my mind wanders', 'dhyan nahi lagta', 'focus nahi hota'], 1),
  ('focus', 'How do I stop getting distracted?', 'बार-बार ध्यान भटकना कैसे रोकूँ?',
    array['I get distracted easily', 'mann bhatakta rehta hai'], 2),

  ('phone', 'How do I reduce my phone use?', 'फ़ोन का इस्तेमाल कैसे कम करूँ?',
    array['phone addiction', 'mobile ki lat', 'reels dekhta rehta hu'], 1),
  ('phone', 'Why does social media make me feel worse?', 'सोशल मीडिया से मन और खराब क्यों होता है?',
    array['instagram makes me sad', 'social media se bura lagta hai'], 2),

  ('habits', 'How do I quit a bad habit?', 'बुरी आदत कैसे छोड़ूँ?',
    array['bad habits', 'buri aadat nahi chhutti', 'smoking chhodna hai'], 1),
  ('habits', 'How do I stop watching porn?', 'अश्लील चीज़ें देखना कैसे छोड़ूँ?',
    array['porn addiction', 'gande video dekhna band karna hai'], 2),
  ('habits', 'How do I quit alcohol or other addictions?', 'शराब या नशे की लत कैसे छोड़ूँ?',
    array['drinking problem', 'nasha chhodna hai', 'sharab ki lat'], 3),

  ('grief', 'How do I cope with the death of a loved one?', 'किसी अपने की मृत्यु का दुख कैसे सहूँ?',
    array['my father passed away', 'my mother died', 'kisi apne ki maut', 'unki yaad bahut aati hai'], 1),
  ('grief', 'Will I ever stop missing them?', 'क्या उनकी याद कभी कम होगी?',
    array['I miss them every day', 'har din yaad aati hai'], 2),

  ('death', 'Why am I so afraid of death?', 'मुझे मृत्यु से इतना डर क्यों लगता है?',
    array['fear of dying', 'maut ka dar', 'death anxiety'], 1),
  ('death', 'What happens after we die?', 'मृत्यु के बाद क्या होता है?',
    array['life after death', 'marne ke baad kya hota hai', 'rebirth'], 2),

  ('illness', 'How do I stay strong during illness?', 'बीमारी में मन मज़बूत कैसे रखूँ?',
    array['I have been sick for a long time', 'bimari se pareshan', 'chronic illness'], 1),
  ('illness', 'How do I care for a sick family member without breaking down?', 'बीमार परिजन की सेवा करते हुए खुद को कैसे संभालूँ?',
    array['caregiver stress', 'ghar mein koi bimar hai'], 2),

  ('hard-times', 'How do I stay strong in hard times?', 'कठिन समय में धैर्य कैसे रखूँ?',
    array['going through a bad phase', 'bura waqt chal raha hai', 'mushkil samay'], 1),
  ('hard-times', 'Why do bad things happen to good people?', 'अच्छे लोगों के साथ बुरा क्यों होता है?',
    array['why me', 'mere saath hi kyun', 'bhagwan mere saath aisa kyun karte hain'], 2),

  ('heavy-heart', 'What do I do when life feels too heavy?', 'जब जीवन बहुत भारी लगे, तब क्या करूँ?',
    array['everything feels pointless', 'sab bekar lagta hai', 'I feel like giving up'], 1),
  ('heavy-heart', 'How do I find a reason to keep going?', 'आगे बढ़ते रहने की वजह कैसे पाऊँ?',
    array['no hope left', 'ummeed khatam ho gayi', 'jeene ka maqsad'], 2),

  ('meditation', 'How do I start meditating?', 'ध्यान करना कैसे शुरू करूँ?',
    array['meditation for beginners', 'dhyan kaise kare', 'meditation kaise shuru karu'], 1),
  ('meditation', 'Why can''t my mind stay still in meditation?', 'ध्यान में मन क्यों नहीं टिकता?',
    array['thoughts come during meditation', 'dhyan mein vichar aate hain'], 2),

  ('devotion', 'How do I grow in devotion to God?', 'भगवान के प्रति भक्ति कैसे बढ़ाऊँ?',
    array['how to love god', 'bhakti kaise kare', 'bhagwan se prem'], 1),
  ('devotion', 'How should I pray?', 'प्रार्थना कैसे करूँ?',
    array['right way to pray', 'puja kaise kare'], 2),
  ('devotion', 'Does God listen to my prayers?', 'क्या भगवान मेरी प्रार्थना सुनते हैं?',
    array['god does not listen to me', 'bhagwan sunte kyun nahi'], 3),

  ('naam-jap', 'How do I start naam jap?', 'नाम जप कैसे शुरू करूँ?',
    array['chanting the name of god', 'naam jap kaise kare', 'mantra jap'], 1),
  ('naam-jap', 'What if my mind wanders during jap?', 'जप करते समय मन भटके तो क्या करूँ?',
    array['my mind wanders while chanting', 'jap mein mann nahi lagta'], 2),

  ('karma', 'Is everything decided by destiny?', 'क्या सब कुछ भाग्य से तय है?',
    array['destiny or free will', 'kismat', 'bhagya ya karm'], 1),
  ('karma', 'Why do I suffer for no fault of mine?', 'बिना गलती के दुख क्यों मिलता है?',
    array['past karma', 'pichhle janam ke karm'], 2),
  ('karma', 'How do I act without worrying about results?', 'फल की चिंता किए बिना कर्म कैसे करूँ?',
    array['nishkam karma', 'result ki chinta'], 3),

  ('purpose', 'What is the purpose of life?', 'जीवन का उद्देश्य क्या है?',
    array['meaning of life', 'zindagi ka matlab', 'why am I here'], 1),
  ('purpose', 'How do I know what I am meant to do?', 'मुझे जीवन में क्या करना है, यह कैसे जानूँ?',
    array['finding my calling', 'life mein kya karna hai'], 2),

  ('surrender', 'How do I let go of things I can''t control?', 'जो मेरे बस में नहीं, उसे कैसे छोड़ूँ?',
    array['letting go', 'chhod dena', 'kuch bhi control mein nahi hai'], 1),
  ('surrender', 'What does it mean to surrender to God?', 'भगवान को समर्पण करने का अर्थ क्या है?',
    array['surrender', 'sharanagati', 'sab bhagwan par chhod dena'], 2)
) as q(topic_slug, text_en, text_hi, phrasings, sort_order)
join public.topics t on t.slug = q.topic_slug;

-- Verses Today rotates through.
insert into public.daily_verses (chapter, verse, sort_order)
select chapter, verse, row_number() over ()
from (values
  (2, 14), (2, 20), (2, 22), (2, 38), (2, 47), (2, 48), (2, 50), (2, 56), (2, 62), (2, 63), (2, 70),
  (3, 19), (3, 35), (4, 7), (4, 38), (5, 10), (6, 5), (6, 6), (6, 17), (6, 26), (6, 35),
  (9, 22), (9, 26), (12, 13), (12, 15), (15, 7), (18, 46), (18, 58), (18, 62), (18, 66), (18, 78)
) as v(chapter, verse);

-- Three seven-day paths. Each day has a verse and a small step; curators
-- add a clip to each day and publish the path in Curator Studio.
insert into public.paths (slug, title_en, title_hi, description_en, description_hi, sort_order) values
  ('calming-a-restless-mind', 'Calming a restless mind', 'बेचैन मन को शांत करना',
    'Seven days of small practices for a mind that will not slow down.',
    'उस मन के लिए सात दिन के छोटे अभ्यास, जो रुकता ही नहीं।', 1),
  ('letting-go-of-anger', 'Letting go of anger', 'क्रोध से मुक्ति',
    'Seven days to notice anger early and let it pass.',
    'क्रोध को जल्दी पहचानने और उसे गुज़र जाने देने के सात दिन।', 2),
  ('strength-in-hard-times', 'Strength in hard times', 'कठिन समय में बल',
    'Seven days of steadiness for when life is hard.',
    'जब जीवन कठिन हो, तब स्थिर रहने के सात दिन।', 3);

with day_plan (path_slug, day, chapter, verse, step_en, step_hi) as (
  values
    ('calming-a-restless-mind', 1, 6, 35,
      'Sit for two minutes and count ten slow breaths. When the mind wanders, start again at one.',
      'दो मिनट बैठें और दस धीमी साँसें गिनें। मन भटके तो फिर एक से शुरू करें।'),
    ('calming-a-restless-mind', 2, 2, 14,
      'When a worry comes today, say quietly "this will pass", and let it go.',
      'आज कोई चिंता आए तो मन में कहें, "यह भी गुज़र जाएगा", और उसे जाने दें।'),
    ('calming-a-restless-mind', 3, 6, 26,
      'Each time you pick up your phone today, take one slow breath first.',
      'आज जब भी फ़ोन उठाएँ, पहले एक धीमी साँस लें।'),
    ('calming-a-restless-mind', 4, 2, 47,
      'Write down one worry. Next to it, write the one thing that is in your hands.',
      'एक चिंता लिखें। उसके आगे वह एक काम लिखें जो आपके हाथ में है।'),
    ('calming-a-restless-mind', 5, 6, 5,
      'Write one kind sentence to yourself, as you would to a friend.',
      'अपने लिए एक प्रेम भरा वाक्य लिखें, जैसे किसी मित्र के लिए लिखते।'),
    ('calming-a-restless-mind', 6, 2, 70,
      'Spend ten minutes without any screen and notice what the mind does.',
      'दस मिनट बिना किसी स्क्रीन के बिताएँ और देखें कि मन क्या करता है।'),
    ('calming-a-restless-mind', 7, 2, 66,
      'Pick the practice from this week that helped most and keep it for one more week.',
      'इस सप्ताह का जो अभ्यास सबसे अच्छा लगा, उसे एक सप्ताह और जारी रखें।'),

    ('letting-go-of-anger', 1, 2, 62,
      'Notice the first sign of anger in your body today: heat, a tight jaw, a fast heart.',
      'आज शरीर में क्रोध का पहला संकेत पहचानें: गर्मी, भिंचा हुआ जबड़ा, तेज़ धड़कन।'),
    ('letting-go-of-anger', 2, 2, 63,
      'Before you reply in anger, wait for ten breaths.',
      'गुस्से में जवाब देने से पहले दस साँसों तक रुकें।'),
    ('letting-go-of-anger', 3, 16, 21,
      'Let one argument go today that does not need to be won.',
      'आज एक ऐसी बहस छोड़ दें जिसे जीतना ज़रूरी नहीं।'),
    ('letting-go-of-anger', 4, 5, 26,
      'When anger rises, drink a glass of water slowly.',
      'क्रोध उठे तो एक गिलास पानी धीरे-धीरे पिएँ।'),
    ('letting-go-of-anger', 5, 12, 13,
      'Think of one person you are angry with and wish them well, once.',
      'जिस पर गुस्सा है, उस एक व्यक्ति के भले की कामना एक बार करें।'),
    ('letting-go-of-anger', 6, 16, 2,
      'Speak softly for one whole conversation today.',
      'आज एक पूरी बातचीत धीमे स्वर में करें।'),
    ('letting-go-of-anger', 7, 3, 37,
      'Write down what usually sits under your anger: hurt, fear or a need that was not met.',
      'लिखें कि आपके क्रोध के नीचे अक्सर क्या होता है: चोट, डर या कोई अधूरी ज़रूरत।'),

    ('strength-in-hard-times', 1, 2, 3,
      'Get up, wash your face and step outside for five minutes.',
      'उठें, मुँह धोएँ और पाँच मिनट बाहर टहल आएँ।'),
    ('strength-in-hard-times', 2, 2, 20,
      'Write three things that have stayed with you through every hard time.',
      'तीन ऐसी बातें लिखें जो हर कठिन समय में आपके साथ रहीं।'),
    ('strength-in-hard-times', 3, 2, 38,
      'Do one small task you have been putting off. Only one.',
      'एक छोटा काम करें जिसे आप टाल रहे थे। बस एक।'),
    ('strength-in-hard-times', 4, 9, 22,
      'Call or message one person who cares about you.',
      'किसी एक अपने को फ़ोन या संदेश करें जो आपकी परवाह करता है।'),
    ('strength-in-hard-times', 5, 18, 66,
      'Before sleep, hand over today''s worries in a short prayer, in your own words.',
      'सोने से पहले अपने शब्दों में एक छोटी प्रार्थना में आज की चिंताएँ भगवान को सौंप दें।'),
    ('strength-in-hard-times', 6, 2, 56,
      'Eat one meal today slowly, without your phone.',
      'आज एक भोजन धीरे-धीरे और बिना फ़ोन के करें।'),
    ('strength-in-hard-times', 7, 18, 78,
      'Write down one thing that gives you hope and keep it where you will see it.',
      'एक बात लिखें जो आपको आशा देती है, और उसे ऐसी जगह रखें जहाँ वह दिखती रहे।')
),
new_steps as (
  insert into public.steps (text_en, text_hi)
  select step_en, step_hi from day_plan
  returning id, text_en
)
insert into public.path_days (path_id, day, verse_chapter, verse_number, step_id)
select p.id, d.day, d.chapter, d.verse, s.id
from day_plan d
join public.paths p on p.slug = d.path_slug
join new_steps s on s.text_en = d.step_en;
