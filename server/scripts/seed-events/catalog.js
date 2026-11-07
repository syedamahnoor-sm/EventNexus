const BATCH_ID = 'eventnexus-campus-events-v1';
const MARKER = `[Development sample: ${BATCH_ID}]`;
const DISTRIBUTION = { Technology: 6, Workshops: 5, Competitions: 5, Career: 5, Community: 5, Other: 4 };
const photos = require('./photos.json');

// Times are campus wall-clock times in UTC+05:00, stored as UTC instants.
// [key, category, title, venue, days ahead, hour, capacity, actual registrations, description]
const CATALOG = [
  ['ai-meetup', 'Technology', 'AI and Machine Learning Meetup', 'Computing Block, Seminar Hall C-201', 1, 15, 120, 18,
    'Bring your questions about machine learning to an afternoon of student lightning talks and practical demonstrations. The computing society will walk through a small language-model application and discuss where automated decisions can go wrong.\n\nNo research background is required. Bring a notebook; laptops are optional, and there will be time to meet potential project teammates.'],
  ['campus-hackathon', 'Technology', 'Campus Hackathon: Build for Student Life', 'Innovation Centre, Collaboration Floor', 3, 10, 160, 32,
    'Spend a day building a useful tool for life on campus: accessibility, society coordination, study groups, or anything your team has noticed needs fixing. Mentors will help with scoping, prototypes, and a short final demonstration.\n\nStudents from design, computing, and other departments are welcome. Bring a laptop and charger; team formation happens at the opening briefing.'],
  ['cloud-lab', 'Technology', 'Cloud Computing: Deploy Your First Service', 'Engineering Lab E-104', 6, 14, 60, 58,
    'Take a small web service from a local development environment to a monitored cloud deployment. Student facilitators will explain environment variables, deployment logs, health checks, and the difference between a demo and a dependable service.\n\nBasic command-line familiarity will help. Bring a laptop; setup instructions and a sandbox environment will be provided at the session.'],
  ['cybersecurity', 'Technology', 'Cybersecurity Clinic: Protect Your Digital Life', 'Central Library, Digital Learning Suite', 12, 11, 90, 0,
    'Explore common phishing patterns, password managers, account recovery, and device security through guided exercises. The information security society will demonstrate attacks only in a controlled training environment.\n\nThe clinic is suitable for every department. Bring your own questions about safer study and collaboration habits; no specialist software is needed.'],
  ['robotics', 'Technology', 'Robotics Open Lab: Sensors to Motion', 'Mechatronics Building, Robotics Studio', 23, 14, 48, 48,
    'Work in small groups to connect distance sensors, tune a simple controller, and guide a tabletop robot through a marked course. Lab mentors will explain each component before the build begins.\n\nAll equipment stays in the lab and is supplied for the session. Closed shoes are required, and a short safety briefing opens the afternoon.'],
  ['open-source', 'Technology', 'Open Source Contribution Evening', 'Computing Commons, Project Room 3', 42, 17, 100, 12,
    'Find a welcoming issue, read a contribution guide, and make a first documentation or code improvement with other students. Experienced contributors will review pull requests and explain how maintainers manage feedback.\n\nBring a laptop with Git installed. You can contribute at any experience level, including through testing, translation, and documentation.'],
  ['web-bootcamp', 'Workshops', 'Web Development Bootcamp: From Layout to Launch', 'Computing Block, Teaching Lab C-102', 2, 10, 30, 28,
    'Build a responsive campus society page with semantic HTML, modern CSS, and a small JavaScript interaction. Facilitators will explain accessibility decisions while you work, rather than adding them at the end.\n\nThis workshop is designed for beginners. Bring a laptop and a code editor; the final half hour is reserved for sharing and troubleshooting your page.'],
  ['ux-design', 'Workshops', 'UI/UX Design Workshop: Better Campus Experiences', 'Design School, Critique Studio 2', 5, 14, 45, 12,
    'Turn a frustrating campus process into a clearer digital experience. Start with a short user interview, sketch alternative journeys, and produce a low-fidelity prototype for peer feedback.\n\nPaper prototyping materials are provided. A laptop is useful but optional, and students from outside the design department are encouraged to join.'],
  ['data-storytelling', 'Workshops', 'Data Storytelling with Python', 'Statistics Department, Computer Lab S-12', 9, 11, 36, 36,
    'Use a small public transport dataset to practice cleaning data, choosing a chart, and writing an honest visual explanation. The session compares useful summaries with misleading scales and incomplete comparisons.\n\nSome basic Python experience is recommended. Bring a laptop with a notebook environment; a setup checklist is available from the workshop facilitators.'],
  ['public-speaking', 'Workshops', 'Public Speaking Studio: Make Your Idea Heard', 'Student Centre, Rehearsal Room', 18, 15, 40, 6,
    'Practice a two-minute introduction, a project pitch, and a short response to an unexpected question. The debating society will offer supportive feedback on structure, pacing, and speaking with confidence.\n\nParticipation is encouraged, but you can begin as an observer. No prepared speech is necessary.'],
  ['research-writing', 'Workshops', 'Research Writing: From Question to Abstract', 'Graduate Centre, Seminar Room G-4', 36, 13, 60, 18,
    'Develop a focused research question and turn it into a clear working abstract. A librarian and postgraduate mentors will cover source evaluation, citation habits, and explaining limitations without losing your main argument.\n\nBring a topic or a draft paragraph. This session supports students preparing their first research proposal in any discipline.'],
  ['coding-challenge', 'Competitions', 'Competitive Programming Challenge', 'Computing Block, Contest Lab C-305', 4, 10, 60, 58,
    'Solve a progressively challenging set of algorithmic problems in a timed individual contest. The programming club will explain the judging system before the clock starts and walk through selected solutions afterwards.\n\nParticipants should know one supported programming language. Bring a laptop; internet access and collaboration rules will be explained at check-in.'],
  ['case-challenge', 'Competitions', 'Campus Sustainability Case Challenge', 'Business School, Case Room B-210', 11, 14, 80, 24,
    'Propose a practical way to reduce waste from a busy campus service. Teams will receive a short case pack, analyze constraints, and present a recommendation to a student and faculty panel.\n\nMixed-discipline teams are welcome. Register individually and form a team at the opening briefing if you do not already have one.'],
  ['design-sprint', 'Competitions', 'Design Sprint: Rethink the Student Noticeboard', 'Design School, Studio Atrium', 16, 10, 48, 48,
    'Respond to a brief about making campus information easier to discover. Teams will sketch, test a concept with volunteers, and explain their design decisions in a short presentation.\n\nThe challenge values clear thinking over polished visuals. Bring drawing materials or a laptop; display boards and prototyping paper are supplied.'],
  ['debate-cup', 'Competitions', 'Interdepartmental Debate Cup', 'Arts Building, Lecture Theatre A-1', 27, 13, 100, 12,
    'Represent your department in an afternoon of structured debate on public-interest topics. The event begins with an explanation of the format, followed by preliminary rounds and a final showcase.\n\nStudents can register as speakers or attend the briefing before choosing a role. Respectful discussion and evidence-based arguments are central to every round.'],
  ['innovation-showcase', 'Competitions', 'Student Innovation Showcase', 'Main Auditorium, Exhibition Foyer', 48, 11, 60, 20,
    'Present a working prototype, research concept, or community project to visitors from across the university. A review panel will offer practical feedback on usability, impact, and the next development milestone.\n\nBring a concise project summary and anything needed for a tabletop demonstration. Projects from every faculty are welcome.'],
  ['career-network', 'Career', 'Career Networking Session: Meet the Alumni', 'Alumni Centre, Garden Hall', 3, 16, 120, 20,
    'Meet graduates working in engineering, technology, communications, and social enterprise through small-group conversations. Alumni will discuss their first roles, unexpected career changes, and ways to build useful professional relationships.\n\nBring questions rather than a rehearsed pitch. The session is intended for students at any stage of their degree.'],
  ['internship-prep', 'Career', 'Internship Preparation Workshop', 'Career Services, Training Room 1', 8, 14, 40, 38,
    'Learn how to compare internship opportunities, tailor a short application, and explain a university project in an interview. Career advisers will use anonymized examples to show what makes an application specific and credible.\n\nBring a draft resume if you have one. Students applying for their first internship are especially welcome.'],
  ['resume-clinic', 'Career', 'Resume and Portfolio Review Clinic', 'Career Services, Consultation Suite', 15, 10, 60, 60,
    'Get structured feedback on a resume or portfolio from career advisers and postgraduate volunteers. Each participant will receive a short review focused on clarity, evidence of skills, and the opportunities they want to pursue.\n\nBring a printed copy or a laptop with your current materials. Please remove private contact information from documents used for group discussion.'],
  ['product-careers', 'Career', 'Careers in Product: Panel and Conversation', 'Business School, Lecture Theatre B-1', 25, 17, 90, 8,
    'Hear how product managers, researchers, and designers collaborate to decide what to build. The panel will discuss early-career responsibilities, useful university experiences, and common misconceptions about product work.\n\nA moderated conversation is followed by audience questions. No prior knowledge of the industry is expected.'],
  ['graduate-interview', 'Career', 'Graduate Interview Practice Lab', 'Student Centre, Professional Skills Room', 39, 14, 80, 12,
    'Practice explaining your experience through short behavioral and problem-solving interviews. Peers rotate between candidate, interviewer, and observer roles using a feedback guide from career services.\n\nBring a role description that interests you. The session focuses on practice and reflection rather than assessment.'],
  ['volunteer-drive', 'Community', 'Community Volunteer Drive', 'Student Centre, Community Desk', 2, 9, 100, 24,
    'Meet student-led service teams and learn about volunteering opportunities in literacy, food support, and neighborhood projects. Each group will explain its training requirements and what a realistic term-time commitment involves.\n\nThe event includes an orientation and a short planning activity. Attending does not commit you to an ongoing placement.'],
  ['campus-garden', 'Community', 'Campus Garden: Plant and Connect', 'Botanical Garden, Teaching Beds', 6, 9, 30, 30,
    'Join the gardening collective to prepare planting beds, label seasonal herbs, and learn simple soil-care techniques. The group will discuss how the teaching garden supports biodiversity and student wellbeing.\n\nTools and gloves are provided. Wear closed shoes and clothing suitable for outdoor work; all experience levels are welcome.'],
  ['peer-mentoring', 'Community', 'Peer Mentoring: Find Your Campus Circle', 'Central Library, Group Study Hall', 13, 15, 50, 48,
    'Connect with peer mentors who can share practical advice about study routines, finding support, and joining university societies. Small-group discussions make room for questions that can feel difficult to ask in a large orientation session.\n\nNew students and anyone settling into a new department are welcome. You can participate without sharing personal information.'],
  ['repair-cafe', 'Community', 'Repair Cafe: Mend, Share, Learn', 'Student Union, Makers Room', 22, 11, 120, 15,
    'Learn basic clothing repairs and simple fixes for everyday items with student volunteers. Demonstration stations cover hand stitching, replacing loose fasteners, and identifying when an item needs professional repair.\n\nBring one small item if you wish. Electrical repairs are not offered, and volunteers cannot guarantee that every item can be fixed.'],
  ['reading-circle', 'Community', 'Campus Reading Circle: Stories Across Cultures', 'Humanities Courtyard, Reading Pavilion', 52, 16, 60, 0,
    'Share a short passage that changed the way you saw a place or a person. The literature society will facilitate an open conversation about translation, belonging, and the stories students bring to campus.\n\nYou can read, listen, or contribute a recommendation. Copies of the session selections will be available at the welcome desk.'],
  ['film-discussion', 'Other', 'Documentary Evening and Student Discussion', 'Media Centre, Screening Room', 5, 18, 100, 10,
    'Watch a faculty-curated short documentary about public spaces and take part in a student-led discussion afterwards. The conversation will consider how editing, sound, and perspective shape a nonfiction story.\n\nThe film title and content notes will be displayed at the venue before entry. The discussion is optional and open to all departments.'],
  ['astronomy-night', 'Other', 'Astronomy Night: A First Look at the Sky', 'Science Building, Rooftop Observatory', 19, 18, 24, 24,
    'Learn to identify a few bright constellations and look through the university telescope with the astronomy society. Facilitators will explain basic observing etiquette and how to read a simple star chart.\n\nWear comfortable shoes and bring a light layer. Observing depends on weather; the indoor introduction can go ahead if skies are cloudy.'],
  ['board-games', 'Other', 'Board Games Social: Strategy and New Friends', 'Student Union, Common Room', 34, 16, 40, 38,
    'Take a break with cooperative games, quick strategy rounds, and a table for first-time players. Student hosts will explain rules and help visitors find a group without needing to arrive with friends.\n\nGames are supplied and no prior experience is needed. You can switch tables between rounds.'],
  ['creative-open-mic', 'Other', 'Creative Open Mic: Words, Music, Campus', 'Arts Courtyard, Small Stage', 65, 17, 160, 8,
    'Listen to student poetry, acoustic music, and short storytelling performances in an informal courtyard setting. The arts collective will host a welcoming lineup with space for first-time performers.\n\nAudience members and performers use the same event registration. Performance slots are coordinated by the hosts at the opening briefing.'],
];

function buildCatalog(now = new Date()) {
  return CATALOG.map(([key, category, title, location, days, hour, capacity, attendees, description]) => {
    const date = new Date(now);
    date.setUTCDate(date.getUTCDate() + days);
    date.setUTCHours(hour - 5, 0, 0, 0);
    return { key, attendees, event: { title, category, location, date, capacity, registeredCount: attendees, status: 'upcoming', description: `${description}\n\n${MARKER} ${key}`, imageUrl: photos[key].imageUrl, imageAlt: photos[key].alt } };
  });
}

module.exports = { BATCH_ID, MARKER, DISTRIBUTION, CATALOG, buildCatalog };
