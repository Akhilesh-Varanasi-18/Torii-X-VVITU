// =========================================================================
// ToriiMinds x VVITU — Programs & Course Syllabus Data
// Structured curriculum with concise, high-impact statements for optimal UI readability.
// =========================================================================

// Shared "Roadmap" pipeline — used by the Bamboo Coder and SkillUp Coder tracks.
// Each node is an achievement badge that keeps its own brand colours; our palette
// lives in the frame / connectors / tags around it. Ordered as a learning arc —
// certify → practice platforms → compete → collaborate → interview — so it reads
// as "start the course → finish placement-ready". `tags` float beside each node;
// the final node is flagged as the destination.
//
// The first two nodes differ per track by language: Bamboo Coder (1st year) works
// in C, SkillUp Coder (2nd year) in C++, so each gets its own CISCO certificate
// and its own HackerRank 5-star badge. Everything from CodeChef onward is shared,
// so `buildRoadmap(cert, hackerRank)` stamps the right pair on the front.
//
// Most badges are square (1254x1254) and fill the figure with `cover`. The
// HackerRank ones are portrait (~385x418), so they carry `fit: 'contain'` — the
// figure letterboxes them on white instead of cropping the badge edges off. See
// `.vvitu-journey-figure.is-contain`.
//
// `github_logo_square.png` is derived from the supplied GitHub-logo.png, which is
// a 3840x2160 (16:9) export whose artwork is only 2335x2095 of that canvas — the
// rest is transparent padding. Dropped in as-is it rendered at roughly half the
// visual weight of its neighbours, so it was trimmed and re-centred on a 1254x1254
// white square to match the rest of the set. Regenerate with `trim()` + `extend`
// if the source logo is ever replaced.
//
// `codechef_logo_square.png` / `leetcode_logo_square.png` replace the earlier
// codechef.jpeg / leetcode.jpeg screenshots with the real brand marks. Their
// sources ("codechef logo.png" / "leetcode logo.png", kept beside them) were
// exported with the transparency checkerboard flattened into the pixels — the
// alpha channel is opaque everywhere and the background is a 20px tile grid of
// #FFF / #F0F0F0, so dropping them in would have shown a grey chequer behind
// each logo. They were rebuilt by flood-filling that grid to white inwards from
// the border (border-connected only, so the cream chef hat and its highlights
// survive), trimming to the ink, then centring it at the same ~83% occupancy
// github_logo_square.png uses. Being square, they need no `fit: 'contain'`.
const JOURNEY_DIR = '/assets/images/vvitu/project-images/course_journey_roadmap';

const CISCO_C_CERT = {
    image: `${JOURNEY_DIR}/Cisco_C_Essentials.png`,
    label: 'CISCO — C Essentials 1',
    caption: 'Verified certification',
    tags: ['Course Completion from CISCO']
};

const CISCO_CPP_CERT = {
    image: `${JOURNEY_DIR}/cisco_cpp_image.png`,
    label: 'CISCO — C++ Essentials 1',
    caption: 'Verified certification',
    tags: ['Course Completion from CISCO']
};

const HACKERRANK_C_BADGE = {
    image: `${JOURNEY_DIR}/HR_C_5star_badge.jpeg`,
    fit: 'contain',
    label: 'HackerRank — C (5 Star)',
    caption: 'Topic-wise mastery',
    tags: ['5-Star C Badge', 'Problem-Solving Practice', 'Topic-Wise Problem Solving', 'Mixed-Concept Problem Solving']
};

const HACKERRANK_CPP_BADGE = {
    image: `${JOURNEY_DIR}/HR_Cpp_5star_Badge.jpeg`,
    fit: 'contain',
    label: 'HackerRank — C++ (5 Star)',
    caption: 'Topic-wise mastery',
    tags: ['5-Star C++ Badge', 'Problem-Solving Practice', 'Topic-Wise Problem Solving', 'Mixed-Concept Problem Solving']
};

const SHARED_ROADMAP = [
    {
        image: `${JOURNEY_DIR}/codechef_logo_square.png`,
        label: 'CodeChef',
        caption: 'Contest problem solving',
        tags: ['CodeChef Problem Solving', 'CodeChef Contest Participation']
    },
    {
        image: `${JOURNEY_DIR}/leetcode_logo_square.png`,
        label: 'LeetCode',
        caption: 'Core problem solving',
        tags: ['LeetCode Problem Solving', 'LeetCode Contest Participation']
    },
    {
        image: `${JOURNEY_DIR}/monthly_coding_contest.jpeg`,
        label: 'Monthly Coding Contest',
        caption: 'Compete & win',
        tags: ['Monthly Coding Contest', 'Post-Contest Upsolving', 'Prizes for Winners']
    },
    {
        image: `${JOURNEY_DIR}/github_logo_square.png`,
        label: 'GitHub',
        caption: 'Store & manage your projects',
        tags: ['Git Version Control']
    },
    {
        image: `${JOURNEY_DIR}/Course_Completion_From_ToriiMinds.png`,
        label: 'ToriiMinds — Course Completion',
        caption: 'Program certificate',
        tags: ['Course Completion from ToriiMinds']
    },
    {
        image: `${JOURNEY_DIR}/Interivew_Prep.png`,
        label: 'Interview Preparation',
        caption: 'Job-ready',
        tags: ['Company Interview Questions', 'Pattern Breakdown'],
        destination: true
    }
];

const buildRoadmap = (cert, hackerRank) => [cert, hackerRank, ...SHARED_ROADMAP];

const BAMBOO_ROADMAP = buildRoadmap(CISCO_C_CERT, HACKERRANK_C_BADGE);
const SKILLUP_ROADMAP = buildRoadmap(CISCO_CPP_CERT, HACKERRANK_CPP_BADGE);

// Moon Coder's specialty — "Contest Upsolving". Instead of the certificate
// pipeline above, this track runs a standing weekly contest timeline: CodeChef
// on Monday and Wednesday, LeetCode's Biweekly on Saturday (every other week)
// and its Weekly on Sunday, with the days between kept for upsolving the
// problems that got away. Four such weeks lead into the month-end ToriiMinds
// Monthly Coding Contest. Rendered by ContestRoadmap in program-detail-modal.jsx:
// a seven-column strip on desktop, a vertical timeline on narrow screens.
//
//   day       Mon … Sun label; `upsolve: true` marks a quiet (practice) day
//   cadence   'weekly' | 'biweekly' — the finale is 'monthly'
//   platform  key into `logos`; the brand marks are the same square PNGs the
//             roadmap uses, plus the Torii mark for the house contest.
const MOON_CONTEST = {
    logos: {
        codechef: `${JOURNEY_DIR}/codechef_logo_square.png`,
        leetcode: `${JOURNEY_DIR}/leetcode_logo_square.png`,
        torii: '/assets/images/vvitu/project-images/torii-mark.svg'
    },
    week: [
        { day: 'Mon', dayName: 'Monday', platform: 'codechef', brand: 'CodeChef', title: 'CodeChef Coding Contest', cadence: 'weekly' },
        { day: 'Tue', dayName: 'Tuesday', upsolve: true },
        { day: 'Wed', dayName: 'Wednesday', platform: 'codechef', brand: 'CodeChef', title: 'CodeChef Coding Contest', cadence: 'weekly' },
        { day: 'Thu', dayName: 'Thursday', upsolve: true },
        { day: 'Fri', dayName: 'Friday', upsolve: true },
        { day: 'Sat', dayName: 'Saturday', platform: 'leetcode', brand: 'LeetCode', title: 'LeetCode Biweekly Contest', cadence: 'biweekly' },
        { day: 'Sun', dayName: 'Sunday', platform: 'leetcode', brand: 'LeetCode', title: 'LeetCode Weekly Contest', cadence: 'weekly' }
    ],
    finale: {
        platform: 'torii',
        brand: 'ToriiMinds',
        title: 'Monthly Coding Contest',
        cadence: 'monthly',
        note: 'Four weeks of contests build up to one full-length contest set by ToriiMinds — the month’s scoreboard, upsolved together afterwards.',
        tags: ['Monthly Coding Contest', 'Post-Contest Upsolving', 'Prizes for Winners']
    }
};

export // -------------------------------------------------------------------------
// Courses shared by more than one program.
//
// AI Ready is the only track on offer right now and its syllabus opens with
// Problem Solving & DSA and Advanced Competitive Programming — two courses that
// already existed under SkillUp Coder and Owl Coder respectively. They are
// lifted out here and referenced from BOTH places rather than copy-pasted, so a
// syllabus correction lands everywhere at once. React only needs `id` to be
// unique among siblings, so sharing one object across programs is safe.
// -------------------------------------------------------------------------
const COURSE_PROBLEM_SOLVING_DSA = {
                id: 'skillup-problem-solving-dsa',
                title: 'Problem Solving & DSA',
                level: '',
                prerequisites: 'Beginner Friendly — Basic Programming Syntax',
                overview: 'A single end-to-end track that starts from programming fundamentals and problem-solving basics and builds up to core data structures and algorithms — arrays, strings, searching, sorting, hashing, sets, two pointers, sliding window, recursion, stacks, queues, linked lists and binary trees.',
                outcomes: [
                    'Write clean programs using variables, operators, conditionals, loops & functions',
                    'Analyze time and space complexity with Big-O notation',
                    'Solve number system, digit, prime, factor, GCD & LCM problems',
                    'Manipulate arrays, matrices and strings with confidence',
                    'Apply searching, sorting, hashing, sets, two pointers and sliding window techniques',
                    'Implement stacks, queues and linked lists from scratch',
                    'Master recursion, backtracking and binary tree traversals'
                ],
                modules: [
                    {
                        moduleNumber: 'Module 1',
                        title: 'Programming Fundamentals & Basic Mathematics',
                        topics: [
                            'Variables & Data Types',
                            'Input & Output',
                            'Operators',
                            'Conditional Statements',
                            'Loops',
                            'Number System & Digit Problems',
                            'Factors, GCD & LCM'
                        ]
                    },
                    {
                        moduleNumber: 'Module 2',
                        title: 'Arrays & Matrices',
                        topics: [
                            'Array Basics & Traversal',
                            'Array Manipulation',
                            'Basic Mathematics with Arrays',
                            'Dynamic Arrays & Operations',
                            '2D Arrays & Matrices',
                            'Array-Based Problem Solving',
                            'Prime Numbers & Sieve of Eratosthenes'
                        ]
                    },
                    {
                        moduleNumber: 'Module 3',
                        title: 'Strings & Character Processing',
                        topics: [
                            'String Basics & Traversal',
                            'Character Operations',
                            'Character Frequency Problems',
                            'Palindrome & Anagram Problems',
                            'String-Based Problem Solving'
                        ]
                    },
                    {
                        moduleNumber: 'Module 4',
                        title: 'Functions & Complexity Analysis',
                        topics: [
                            'Writing Functions',
                            'Built-in Functions',
                            'Time & Space Complexity',
                            'Big-O Notation & Analysis of Solutions'
                        ]
                    },
                    {
                        moduleNumber: 'Module 5',
                        title: 'Searching & Sorting',
                        topics: [
                            'Linear Search',
                            'Binary Search',
                            'lower_bound & upper_bound',
                            'Search-Based Problems',
                            'Sorting-Based Problem Solving',
                            'Custom Sorting & Comparators'
                        ]
                    },
                    {
                        moduleNumber: 'Module 6',
                        title: 'Hashing, Maps & Sets',
                        topics: [
                            'Hashing Fundamentals',
                            'Hash Tables & Hash Maps',
                            'Key-Value Operations',
                            'Frequency & Counting Problems',
                            'Ordered & Unordered Sets',
                            'Set Operations',
                            'Hash & Set Based Problem Solving'
                        ]
                    },
                    {
                        moduleNumber: 'Module 7',
                        title: 'Two Pointers & Sliding Window',
                        topics: [
                            'Two Pointer Technique',
                            'Opposite & Same Direction Pointers',
                            'Fixed-Size Window',
                            'Variable-Size Window',
                            'Two Pointer & Sliding Window Problem Solving'
                        ]
                    },
                    {
                        moduleNumber: 'Module 8',
                        title: 'Recursion & Backtracking',
                        topics: [
                            'Recursion Fundamentals',
                            'Recursive Problem Solving',
                            'Recursion with Arrays & Strings',
                            'Backtracking Fundamentals',
                            'Backtracking Problem Solving'
                        ]
                    },
                    {
                        moduleNumber: 'Module 9',
                        title: 'Stacks & Queues',
                        topics: [
                            'Stack Fundamentals & Operations',
                            'Valid Parentheses & Expression Evaluation',
                            'Stack-Based Problem Solving',
                            'Queue Fundamentals & Operations',
                            'Circular Queue',
                            'Queue-Based Problem Solving'
                        ]
                    },
                    {
                        moduleNumber: 'Module 10',
                        title: 'Linked Lists & Binary Trees',
                        topics: [
                            'Linked List Fundamentals & Singly Linked List',
                            'Insertion, Deletion & Traversal',
                            'Linked List Problem Solving',
                            'Binary Tree Fundamentals & Terminology',
                            'Tree Representation',
                            'Preorder, Inorder & Postorder Traversals',
                            'Level Order Traversal',
                            'Binary Tree Problem Solving'
                        ]
                    }
                ],
                skillBuilding: {
                    title: 'Problem Solving & Skill Building',
                    items: [
                        'Monthly Coding Contest',
                        'OwlCoder Platform Access',
                        'LeetCode Problem Solving',
                        'LeetCode Contest Participation',
                        'CodeChef Problem Solving',
                        'CodeChef Contest Participation',
                        'Post-Contest Problem Solving (Upsolving)',
                        'HackerRank Programming Badge Completion',
                        'HackerRank Problem Solving Badge Completion',
                        'Topic-Wise Problem Solving',
                        'Mixed Concept Problem Solving'
                    ]
                },
                journey: SKILLUP_ROADMAP
            };

const COURSE_ADVANCED_CP_DSA = {
                id: 'owl-adv-dsa',
                title: 'Advanced Competitive Programming & DSA Mastery',
                level: '',
                prerequisites: 'Strong DSA & Coding Foundations',
                overview: 'Intensive 21-module advanced roadmap covering complexity analysis, advanced data structures, Graph algorithms, DP patterns, Segment Trees, and competitive number theory.',
                outcomes: [
                    'Master Big-O, Big-Theta, and Big-Omega asymptotic complexity analysis',
                    'Implement advanced Sorting, Searching on Answer, and Kadane / Prefix Sum patterns',
                    'Solve Hard-tier Recursion, Backtracking (N-Queens, Sudoku), and Monotonic Stacks',
                    'Master complete Tree and Graph algorithms (Shortest Paths, MST, DSU, Bridges)',
                    'Master Dynamic Programming patterns (1D, 2D Grid, Knapsack, Bitmask, Digit DP)',
                    'Implement Segment Trees, Fenwick Trees, String Algorithms (KMP, Z-Algorithm), and Number Theory'
                ],
                modules: [
                    {
                        moduleNumber: 'Module 1',
                        title: 'Complexity Analysis',
                        duration: 'Core',
                        topics: [
                            'Big-O, Big-Theta & Big-Omega Asymptotic Analysis (Detailed)',
                            'Recurrence Relations & Master Theorem'
                        ]
                    },
                    {
                        moduleNumber: 'Module 2',
                        title: 'Sorting (Advanced)',
                        duration: 'Core',
                        topics: [
                            'Merge Sort Implementation & Inversion Count',
                            'Quick Sort (Lomuto & Hoare Partitioning)',
                            'Heap Sort & Priority Queue Sorting'
                        ]
                    },
                    {
                        moduleNumber: 'Module 3',
                        title: 'Arrays (Advanced)',
                        duration: 'Core',
                        topics: [
                            'Array Rearrangement & Rotation Techniques',
                            'Kadane\'s Algorithm for Maximum Subarray Sum',
                            'Prefix Sum & 2D Difference Array Optimization'
                        ]
                    },
                    {
                        moduleNumber: 'Module 4',
                        title: 'Searching (Advanced)',
                        duration: 'Core',
                        topics: [
                            'Binary Search on Answer Space (Predicate Functions)',
                            'Binary Search on Rotated & Modified Arrays'
                        ]
                    },
                    {
                        moduleNumber: 'Module 5',
                        title: 'Strings (Advanced)',
                        duration: 'Core',
                        topics: [
                            'Advanced String Manipulation & Substring Problems',
                            'String Polynomial Rolling Hashing Basics'
                        ]
                    },
                    {
                        moduleNumber: 'Module 6',
                        title: 'Linked List (Advanced)',
                        duration: 'Core',
                        topics: [
                            'Singly, Doubly & Circular Linked List Operations',
                            'Floyd\'s Cycle Detection, K-Group Reversal & Multi-Way Merge'
                        ]
                    },
                    {
                        moduleNumber: 'Module 7',
                        title: 'Recursion & Backtracking (Advanced)',
                        duration: 'Core',
                        topics: [
                            'Advanced Recursion State Trees & Call Stack Memory',
                            'N-Queens, Sudoku Solver & Complex Matrix Backtracking',
                            'Full Permutations, Combinations & Subsets Generation'
                        ]
                    },
                    {
                        moduleNumber: 'Module 8',
                        title: 'Bit Manipulation',
                        duration: 'Core',
                        topics: [
                            'Bit Manipulation Full Pattern Set & Bitmasks',
                            'Fast Exponentiation & Bitwise Subsets Generation'
                        ]
                    },
                    {
                        moduleNumber: 'Module 9',
                        title: 'Stack & Queue',
                        duration: 'Core',
                        topics: [
                            'Stack Advanced Applications & Expression Evaluation',
                            'Queue, Deque & Circular Queue Architecture',
                            'Monotonic Stack & Monotonic Queue Patterns'
                        ]
                    },
                    {
                        moduleNumber: 'Module 10',
                        title: 'Two Pointer & Sliding Window',
                        duration: 'Core',
                        topics: [
                            'Two Pointer Advanced Problems (Opposite Ends & Meet in Middle)',
                            'Sliding Window Dynamic Subarray & Substring Patterns'
                        ]
                    },
                    {
                        moduleNumber: 'Module 11',
                        title: 'Hashing',
                        duration: 'Core',
                        topics: [
                            'Advanced Frequency Counting & Custom Hash Functions',
                            'Target Pair & Subarray Sum Hashing Optimization'
                        ]
                    },
                    {
                        moduleNumber: 'Module 12',
                        title: 'Heaps (Advanced)',
                        duration: 'Core',
                        topics: [
                            'Min-Heap & Max-Heap Custom Comparators',
                            'Priority Queue Advanced K-Way Merge & Median Maintenance'
                        ]
                    },
                    {
                        moduleNumber: 'Module 13',
                        title: 'Greedy Algorithms',
                        duration: 'Core',
                        topics: [
                            'Greedy Choice Property Proofs & Full Pattern Set',
                            'Interval Scheduling, Huffman Coding & Gas Station Problems'
                        ]
                    },
                    {
                        moduleNumber: 'Module 14',
                        title: 'Divide & Conquer',
                        duration: 'Core',
                        topics: [
                            'Divide and Conquer Algorithmic Paradigm',
                            'Closest Pair of Points & Matrix Multiplication'
                        ]
                    },
                    {
                        moduleNumber: 'Module 15',
                        title: 'Trees (Complete)',
                        duration: 'Core',
                        topics: [
                            'Binary Trees & Binary Search Trees (BST) Full Concepts',
                            'Recursive & Iterative Tree Traversals',
                            'Diameter, Lowest Common Ancestor (LCA) & Tree Views',
                            'Tree Serialization, Deserialization & Construction'
                        ]
                    },
                    {
                        moduleNumber: 'Module 16',
                        title: 'Tries',
                        duration: 'Core',
                        topics: [
                            'Trie Construction, Insertion & Prefix Search',
                            'Trie Advanced Applications (Auto-complete & Maximum XOR Pair)'
                        ]
                    },
                    {
                        moduleNumber: 'Module 17',
                        title: 'Graphs (Complete)',
                        duration: 'Core',
                        topics: [
                            'Graph Representations (Adjacency Matrix & List)',
                            'Advanced BFS & DFS Traversals & Cycle Detection',
                            'Shortest Path: Dijkstra, Bellman-Ford & Floyd-Warshall',
                            'Minimum Spanning Trees: Prim\'s & Kruskal\'s Algorithms',
                            'Topological Sorting & Disjoint Set Union (DSU / Union-Find)',
                            'Strongly Connected Components (SCC), Bridges & Articulation Points'
                        ]
                    },
                    {
                        moduleNumber: 'Module 18',
                        title: 'Dynamic Programming (Complete)',
                        duration: 'Core',
                        topics: [
                            'DP 1D Patterns & Transition States',
                            'DP 2D & Matrix Grid Patterns',
                            'Knapsack Patterns (0/1, Unbounded, Fractional)',
                            'String DP: Longest Common Subsequence (LCS), Edit Distance, Palindromes',
                            'Advanced DP: Bitmask DP, Digit DP & Tree DP'
                        ]
                    },
                    {
                        moduleNumber: 'Module 19',
                        title: 'Segment Tree & Fenwick Tree',
                        duration: 'CP Track',
                        topics: [
                            'Segment Tree Construction, Point Updates & Range Queries',
                            'Fenwick Tree (Binary Indexed Tree / BIT) Operations'
                        ]
                    },
                    {
                        moduleNumber: 'Module 20',
                        title: 'String Algorithms',
                        duration: 'CP Track',
                        topics: [
                            'Knuth-Morris-Pratt (KMP) Pattern Matching',
                            'Z-Algorithm for Pattern Searching',
                            'Rabin-Karp Rolling Hash Algorithm',
                            'Manacher\'s Algorithm for Longest Palindromic Substring'
                        ]
                    },
                    {
                        moduleNumber: 'Module 21',
                        title: 'Number Theory',
                        duration: 'CP Track',
                        topics: [
                            'Greatest Common Divisor (GCD) & Extended Euclidean Algorithm',
                            'Sieve of Eratosthenes & Prime Factorization',
                            'Modular Arithmetic, Modular Inverse & Fermat\'s Little Theorem'
                        ]
                    }
                ]
            };

// -------------------------------------------------------------------------
// Parked AI Ready courses. VVITU's AI Ready intake currently runs four courses
// (see the `courses` array on the aiready program); these two are not being
// offered. They are kept whole rather than deleted so restoring one is a single
// edit — drop its identifier back into that array in the position you want.
// -------------------------------------------------------------------------
const COURSE_AWS_CLOUD_DEVOPS = {
                id: 'aiready-cloud-devops',
                title: 'AWS Cloud and Devops + AI Integration',
                level: 'Intermediate to Advanced',
                prerequisites: 'Basic Computer Networking & Operating System Fundamentals',
                overview: 'Master AWS cloud architecture, Linux, Docker, Kubernetes, Terraform CI/CD, and Amazon Bedrock GenAI with capstone project.',
                outcomes: [
                    'Master computer networking fundamentals, TCP/IP, VPC subnetting, and Linux Bash automation',
                    'Architect scalable AWS cloud infrastructure (EC2, S3, RDS, VPC, IAM, Serverless Lambda)',
                    'Containerize applications with Docker and orchestrate microservices using Kubernetes & Amazon EKS',
                    'Automate infrastructure as code with Terraform and build CI/CD pipelines with GitHub Actions / Jenkins',
                    'Integrate GenAI on AWS using Amazon Bedrock, Knowledge Bases for RAG, AgentCore, and Amazon Q Developer',
                    'Build a production 3-tier capstone application with CI/CD and prepare for AWS Certifications (CLF-C02, AIF-C01)'
                ],
                modules: [
                    {
                        moduleNumber: 'Module 1',
                        title: 'Networking Essentials',
                        topics: [
                            'OSI 7-Layer & TCP/IP Network Models, Ports & Protocols',
                            'IPv4 / IPv6 Addressing, Subnetting & CIDR Notation',
                            'Routing, Switching, DNS & DHCP Name Resolution',
                            'Network Security: Firewalls, VPNs, NAT Gateways & Proxies',
                            'Hands-on Lab: Subnet Design Exercise & Wireshark Packet Capture'
                        ]
                    },
                    {
                        moduleNumber: 'Module 2',
                        title: 'Linux Fundamentals & Shell Scripting',
                        topics: [
                            'Linux Architecture & Major Distributions (Amazon Linux, Ubuntu)',
                            'Filesystem Hierarchy, Users, Groups & Sudo Permissions',
                            'Package Management (yum/dnf, apt) & Systemd Service Controls',
                            'Bash Scripting: Variables, Loops, Conditionals & Functions',
                            'Remote Access (SSH Key-Auth), Cron Jobs & Journald System Logs',
                            'Hands-on Lab: Provision, Harden & Automate an EC2 Linux Server'
                        ]
                    },
                    {
                        moduleNumber: 'Module 3',
                        title: 'AWS Cloud Core Services',
                        topics: [
                            'AWS Global Infrastructure: Regions, Availability Zones & Edge Locations',
                            'Identity & Access Management (IAM): Users, Roles, Policies & MFA',
                            'Virtual Private Cloud (VPC): Subnets, Route Tables, NAT & Security Groups',
                            'Compute: Amazon EC2 Instances, AMIs, Auto Scaling & Elastic Load Balancing',
                            'Storage & Databases: S3 Lifecycle Policies, EFS, RDS & DynamoDB',
                            'Observability & Serverless: CloudWatch, CloudTrail, AWS Lambda & API Gateway',
                            'Cloud Security: Security Hub, GuardDuty, WAF & Well-Architected Framework',
                            'Mini-Project: Deploy a Highly Available 3-Tier Web App on AWS'
                        ]
                    },
                    {
                        moduleNumber: 'Module 4',
                        title: 'DevOps',
                        topics: [
                            'DevOps Culture, Branching Strategies & Git / GitHub Workflows',
                            'Automated CI/CD Pipelines with Jenkins, AWS CodePipeline & CodeBuild',
                            'Docker: Containerization, Multi-Stage Dockerfiles & Docker Compose',
                            'Kubernetes & Amazon EKS: Pods, Deployments, Services & Helm Charts',
                            'Infrastructure as Code (IaC) with Terraform & CloudFormation',
                            'Configuration Management with Ansible & DevSecOps Security Scanning',
                            'Hands-on Project: End-to-End CI/CD Pipeline Deploying App to EKS'
                        ]
                    },
                    // {
                    //     moduleNumber: 'Module 5',
                    //     title: 'AI on AWS (GenAI & MLOps)',
                    //     duration: '18 Hours',
                    //     topics: [
                    //         'AWS AI/ML Ecosystem & Foundation Models Overview',
                    //         'Amazon Bedrock: Unified Claude, Llama & Nova Model Access',
                    //         'Knowledge Bases for Retrieval-Augmented Generation (RAG)',
                    //         'Bedrock AgentCore: Autonomous Multi-Tool AI Agents',
                    //         'Amazon Q Developer: AI Pair-Programming (/dev, /transform, /test)',
                    //         'Amazon SageMaker Fundamentals & Responsible AI Guardrails',
                    //         'Hands-on Lab: Build a RAG Chatbot with Bedrock Knowledge Bases'
                    //     ]
                    // },
                    {
                        moduleNumber: 'Module 5',
                        title: 'Capstone Project & AWS Certification Prep',
                        topics: [
                            'Capstone Project: 3-Tier App with Full CI/CD, EKS & Bedrock AI Integration',
                            'Live Project Demonstration, Architecture Review & Defense',
                            'AWS Certified Cloud Practitioner (CLF-C02) Prep & Mock Questions',
                            'AWS Certified AI Practitioner (AIF-C01) & Solutions Architect Roadmap',
                            'Final Practical Assessment & Technical Interview Prep'
                        ]
                    }
                ]
            };

// Offered by Moon Coder. NO AI CONTENT, deliberately — Moon Coder is not an AI
// track, so the Now Assist / GenAI / AI Agents material this course used to
// carry is gone and must not come back here; it belongs in a course of its own.
//
// Built from the two official syllabus sheets VVITU supplied (2026-10-27), which
// are organised by CERTIFICATION, not by teaching order:
//   • CSA  — Certified System Administrator (6 exam domains)
//   • CAD  — Certified Application Developer (3 domains)
// Those module names and topics are the spine. The earlier VVITU syllabus was a
// different cut of the same material, so rather than keeping both and
// duplicating half of it, every topic from the old version was folded into the
// domain it belongs to. Nothing was dropped: users/groups/roles, update sets,
// import sets, data policies, scheduled jobs, system logs, Flow Designer,
// IntegrationHub and the ATF work all survive, just under the official headings.
//
// Each track ends with an exam checkpoint. Those two modules are NOT on the
// client sheets — they are kept from the previous syllabus because the course
// outcomes promise CSA and CAD preparation, and a certification track with no
// revision module does not deliver that.
const COURSE_SERVICENOW = {
    id: 'moon-servicenow',
    title: 'ServiceNow Platform Engineering',
    level: 'Intermediate to Advanced',
    prerequisites: 'JavaScript Fundamentals & Relational Data Basics',
    overview: 'Two certification tracks in one course — Certified System Administrator (CSA) then Certified Application Developer (CAD) — covering platform administration, ITSM, data and access control, then scripting, scoped app development, Flow Designer and integrations.',
    outcomes: [
        'Navigate and configure a ServiceNow instance: applications, plugins, UI and personalization',
        'Configure lists, forms, UI policies and business rules across Incident, Problem and Change',
        'Run Self Service: Knowledge, Service Catalog, record producers and Virtual Agent',
        'Model data properly — tables, dictionary, CMDB, import sets and access control',
        'Script the platform server-side and client-side with the Glide APIs',
        'Build scoped applications, automate with Flow Designer and integrate over REST and SOAP',
        'Sit the Certified System Administrator (CSA) and Certified Application Developer (CAD) exams'
    ],
    modules: [
        {
            moduleNumber: 'Module 1',
            title: 'Platform Overview and Navigation',
            duration: 'CSA Track',
            topics: [
                'ServiceNow Platform overview',
                'Platform capabilities and services',
                'The ServiceNow Instance: architecture, instance model & PDI setup',
                'Next Experience Unified Navigation',
                'Platform navigation: lists, forms and related lists'
            ]
        },
        {
            moduleNumber: 'Module 2',
            title: 'Instance Configuration',
            duration: 'CSA Track',
            topics: [
                'Installing applications and plugins',
                'Personalizing / customizing the instance',
                'Common user interfaces in the Platform',
                'System properties, data policies and scheduled jobs',
                'System logs, troubleshooting and the script debugger'
            ]
        },
        {
            moduleNumber: 'Module 3',
            title: 'Configuring Applications for Collaboration',
            duration: 'CSA Track',
            topics: [
                'Lists, Filters and Tags',
                'Lists and Forms',
                'Form Configuration: layout, list control, UI policies vs client scripts',
                'Incident Management lifecycle, states and assignment',
                'Change Management (CAB and risk assessment)',
                'Problem Management',
                'Visual Task Boards (VTBs)',
                'Reporting and Dashboards: report types, gauges, widgets, interactive filters',
                'Performance Analytics: indicators, breakdowns and time series',
                'Notifications: email notifications, templates, SLA / OLA configuration'
            ]
        },
        {
            moduleNumber: 'Module 4',
            title: 'Self Service & Automation',
            duration: 'CSA Track',
            topics: [
                'Knowledge Management',
                'Service Catalog: catalog items, variables and record producers',
                'Creation of Applications and modules',
                'Virtual Agent'
            ]
        },
        {
            moduleNumber: 'Module 5',
            title: 'Database Management',
            duration: 'CSA Track',
            topics: [
                'Data schema and importing data: import sets, transform maps, coalescing & field mapping',
                'Tables & data model: fields, field types, dictionary and references',
                'Users, groups, roles and company / department records',
                'Application / Access Control: ACL deep-dive, conditions, scripting and delegated administration',
                'Configuration Management Database (CMDB) and Discovery overview'
            ]
        },
        {
            moduleNumber: 'Module 6',
            title: 'Data Migration and Integration',
            duration: 'CSA Track',
            topics: [
                'UI Policies',
                'Business Rules (before, after, async, display)',
                'Update Sets: creation, capturing and instance migration'
            ]
        },
        {
            moduleNumber: 'Module 7',
            title: 'CSA Exam Prep & Certification Checkpoint',
            duration: 'CSA Track',
            topics: [
                'Full CSA domain review: interface, UI, users and security',
                'Automated Test Framework (ATF) introduction',
                'Timed full-length mock exams and gap analysis',
                'Checkpoint: Certified System Administrator (CSA)'
            ]
        },
        {
            moduleNumber: 'Module 8',
            title: 'Application Automation',
            duration: 'CAD Track',
            topics: [
                'JavaScript Fundamentals (ES5 / ES6 for ServiceNow)',
                'Glide API overview: server-side vs client-side',
                'GlideRecord: querying, inserting, updating and deleting',
                'GlideForm (g_form): reading and controlling the form',
                'GlideUser (g_user): roles and session data on the client',
                'Client Scripts: onLoad, onChange, onSubmit and onCellEdit',
                'Debugging: background scripts and gs.info best practices'
            ]
        },
        {
            moduleNumber: 'Module 9',
            title: 'Application User Interface',
            duration: 'CAD Track',
            topics: [
                'UI Actions, UI Pages and UI Macros',
                'Scheduled Jobs and scheduled script execution',
                'ACLs: scoped access control and custom role design',
                'Business Rules in scoped applications, with Script Includes'
            ]
        },
        {
            moduleNumber: 'Module 10',
            title: 'Designing & Creating Applications',
            duration: 'CAD Track',
            topics: [
                'GlideAjax: calling Script Includes from the client',
                'UI Policies in scoped applications',
                'SLAs and SLM: definitions, schedules and breach handling',
                'REST & SOAP APIs: scripted REST APIs, inbound REST messages, SOAP basics',
                'IntegrationHub: spokes, connections, credential aliases and custom actions',
                'Scoped Applications & Studio: architecture, custom tables, menus, cross-scope access',
                'Flow Designer: triggers, actions, flows vs subflows, approvals and error handling'
            ]
        },
        {
            moduleNumber: 'Module 11',
            title: 'Server-Side Glide APIs',
            duration: 'CAD Track',
            topics: [
                'GlideSystem (gs): session, user, logging and utility methods',
                'GlideAggregate: counts, sums and grouped aggregation',
                'GlideDate, GlideDateTime and GlideDuration: date maths and time zones'
            ]
        },
        {
            moduleNumber: 'Module 12',
            title: 'Testing, Capstone & CAD Exam Prep',
            duration: 'CAD Track',
            topics: [
                'Automated Test Framework (ATF) test suites for scoped apps',
                'Performance optimization and GlideRecord anti-patterns review',
                'Capstone project: custom scoped app with Flow Automation & IntegrationHub',
                'Full CAD domain review, mock exams and exam checkpoint'
            ]
        }
    ]
};


// ── Shared course objects ───────────────────────────────────────────────────
// Full Stack Development and Google Flutter are offered by BOTH AI Ready
// Engineers and Moon Coder, so they live here as single objects referenced from
// each program's `courses` array rather than being duplicated. Edit the syllabus
// once and both programs move together — which is the point, because they are
// genuinely the same course taught to two intakes.
//
// Neither contains AI content: VVITU's Moon Coder track is explicitly not an
// AI programme, and the AI-integration modules these two used to carry were
// stripped out earlier for the same reason.
const COURSE_FULL_STACK = {
    id: 'aiready-fullstack',
    title: 'Full Stack Development',
    level: 'Beginner to Advanced',
    prerequisites: 'Basic Programming Fundamentals',
    overview: 'Master HTML5, CSS3, JavaScript, React.js, Node.js, Express, MongoDB, and cloud deployment.',
    outcomes: [
        'Build responsive, accessible frontend user interfaces with HTML5, CSS3, and React.js',
        'Develop secure RESTful backend APIs with Node.js, Express.js, and JWT authentication',
        'Model and query scalable NoSQL databases with MongoDB Atlas and Mongoose',
        'Containerize applications with Docker and deploy to Vercel and AWS cloud infrastructure',
        'Deliver an end-to-end production-ready SaaS full-stack capstone project'
    ],
    modules: [
        {
            moduleNumber: 'Module 1',
            title: 'Web Fundamentals: HTML5 & Modern CSS',
            topics: [
                'HTML5 Semantic Elements, Forms & Input Validations',
                'CSS3 Box Model, Flexbox & CSS Grid Layouts',
                'Responsive Web Design: Media Queries & Mobile-First Design',
                'Mini-Project: Responsive Developer Portfolio Landing Page'
            ]
        },
        {
            moduleNumber: 'Module 2',
            title: 'JavaScript Mastery & Async Programming',
            topics: [
                'JavaScript Core: Variables, Data Types, Operators, Control Flow & Loops',
                'Functions, Arrow Functions & Array/Object Methods',
                'DOM Manipulation, Events, Browser Storage & Debugging',
                'Scope, Hoisting & Closures',
                'Async JavaScript: Callbacks, Promises, Async/Await & Error Handling',
                'Modern ES6+ Features, Modules & JSON',
                'Consuming REST APIs with Fetch API, Axios & NPM Basics'
            ]
        },
        {
            moduleNumber: 'Module 3',
            title: 'Frontend with React',
            topics: [
                'React Basics & JSX',
                'Components, Props & State',
                'React Hooks: useState & useEffect',
                'Forms Handling & Client-Side Routing',
                'REST API Integration in React',
                'Styling Approaches in React'
            ]
        },
        {
            moduleNumber: 'Module 4',
            title: 'Backend with Node & Express',
            topics: [
                'Node.js Architecture & Runtime',
                'Express.js Framework Fundamentals',
                'Routing & Middleware',
                'Building REST APIs & CRUD Operations',
                'JWT Authentication Basics',
                'API Testing with Postman'
            ]
        },
        {
            moduleNumber: 'Module 5',
            title: 'MongoDB & Full MERN Stack',
            topics: [
                'MongoDB Basics & Documents',
                'Mongoose Schemas & Models',
                'Database Integration',
                'Full MERN Stack Flow',
                'Authentication Flow',
                'Deployment Basics'
            ]
        },
        {
            moduleNumber: 'Module 6',
            title: 'Authentication, Authorization & Security',
            topics: [
                'Password Hashing & Salt Generation with bcrypt',
                'JSON Web Tokens (JWT): Authentication & Token Verification',
                'Role-Based Access Control (RBAC): Admin vs User Routes',
                'Web Security: CORS'
            ]
        },
        {
            moduleNumber: 'Module 7',
            title: 'Cloud Deployment, DevOps & Production Capstone',
            topics: [
                'Environment Configurations & Production Secrets (.env)',
                'Cloud Deployment: Frontend on Vercel & Backend on AWS / Render',
                'Automated CI/CD Workflows with GitHub Actions',
                'Full-Stack Capstone Project: Production SaaS Web Application'
            ]
        }
    ]
};

const COURSE_GOOGLE_FLUTTER = {
    id: 'aiready-flutter',
    title: 'Google Flutter',
    level: 'Beginner to Advanced',
    prerequisites: 'Basic Programming Fundamentals',
    overview: 'Build cross-platform mobile apps from Dart basics to Firebase backends and Play Store / App Store publishing.',
    outcomes: [
        'Build complete Android & iOS apps from a single codebase with Flutter',
        'Master Material Design UI, theming, and state management with Provider',
        'Integrate live REST APIs, Firebase Auth & Cloud Storage',
        'Generate signed builds and publish to Google Play Store & Apple App Store',
    ],
    modules: [
        {
            moduleNumber: 'Module 1',
            title: 'Introduction to Dart Programming',
            topics: [
                'Basics of Dart: Variables, Data Types, Operators & Keywords',
                'Control Flow: if / else if / else, switch-case statements',
                'Loops & Control Statements: for, while, do-while, break, continue',
                'Functions, Methods, Optional Parameters & Lambda Expressions',
                'Collections Framework: List, Set, Map & Collection Methods'
            ]
        },
        {
            moduleNumber: 'Module 2',
            title: 'Object-Oriented Programming in Dart',
            topics: [
                'Classes, objects, constructors & named parameters',
                'Inheritance, encapsulation, polymorphism & abstract classes',
                'Static variables, methods & factory constructors',
                'Enums, mixins & generic types'
            ]
        },
        {
            moduleNumber: 'Module 3',
            title: 'Introduction to the Flutter Framework',
            topics: [
                'Flutter SDK installation, CLI setup & emulator config',
                'Flutter project creation & folder structure walkthrough',
                'Widget Tree concepts: Stateless vs Stateful Widgets',
                'Core Layout Widgets: Container, Row, Column, Stack, ListView'
            ]
        },
        {
            moduleNumber: 'Module 4',
            title: 'Material Design, Navigation & State Management',
            topics: [
                'Material Design: Scaffold, AppBar, Bottom Navigation Bar',
                'UI Components: Buttons, Forms, Input Fields, Dialogs, Bottom Sheets',
                'Theming & Styling: Colors, typography, dark/light mode',
                'State Management: setState fundamentals & Provider architecture'
            ]
        },
        {
            moduleNumber: 'Module 5',
            title: 'REST API Integration & Firebase Services',
            topics: [
                'HTTP package, REST API calls & JSON model serialization',
                'Error handling, network timeouts & async loading states',
                'Firebase Setup: Authentication (Email/Password & Google Sign-In)',
                'Firebase Cloud Storage: File uploads & cloud image rendering'
            ]
        },
        {
            moduleNumber: 'Module 6',
            title: 'App Deployment & Publishing',
            topics: [
                'Generating signed Android APK & Android App Bundle (AAB)',
                'Keystore generation & release build configuration',
                'Publishing to Google Play Store: Store listing & release tracks',
                'Apple App Store preparation: Provisioning profiles & TestFlight',
                'App versioning, OTA updates & staged rollouts'
            ]
        },
]
};


// ── Data Analytics (Moon Coder) ─────────────────────────────────────────────
// Built from the syllabus VVITU supplied on 2026-10-27. Three tools, taught in
// order: Excel (10 modules) → Power BI (10) → Tableau (5).
//
// The source sheet restarts its numbering at "Module 1" for each tool. Here the
// modules run 1–25 straight through and the TOOL is carried in `duration`,
// which is the same slot the ServiceNow course uses for CSA / CAD. A flat list
// with three "Module 1"s in it would read as a mistake.
const COURSE_DATA_ANALYTICS = {
    id: 'moon-data-analytics',
    title: 'Data Analytics',
    level: 'Beginner to Advanced',
    prerequisites: 'Basic computer literacy — no prior analytics experience needed',
    overview: 'Twenty-five modules across the three tools analysts are actually hired for: Excel from formulas to Power Query and dashboards, Power BI from data modelling through DAX to publishing and row-level security, then Tableau from first chart to published stories.',
    outcomes: [
        'Clean, shape and model real datasets in Excel with Power Query and Power Pivot',
        'Build PivotTables, dynamic array formulas and interactive Excel dashboards',
        'Model data properly in Power BI — star schemas, relationships and date tables',
        'Write DAX from aggregations through CALCULATE, context transition and time intelligence',
        'Design readable reports with drill-through, bookmarks and custom tooltips',
        'Publish to the Power BI Service with scheduled refresh and row-level security',
        'Build and publish Tableau dashboards and data stories',
        'Deliver two end-to-end capstone projects: an Excel dashboard and a Power BI report'
    ],
    modules: [
        {
            moduleNumber: 'Module 1',
            title: 'Excel Foundations for Analytics',
            duration: 'Excel',
            topics: [
                'Excel interface, workbooks and worksheets',
                'Data types and cell formatting',
                'Cell references: relative, absolute, mixed',
                'Basic formulas and operators',
                'Named ranges',
                'Keyboard shortcuts for productivity'
            ]
        },
        {
            moduleNumber: 'Module 2',
            title: 'Data Cleaning & Preparation',
            duration: 'Excel',
            topics: [
                'Removing duplicates and blanks',
                'Text to Columns and Flash Fill',
                'TRIM, CLEAN, PROPER, UPPER, LOWER',
                'LEFT, RIGHT, MID, LEN, FIND, SUBSTITUTE',
                'Data Validation and drop-down lists',
                'Excel Tables (Ctrl+T) and structured references',
                'Handling errors and number formats'
            ]
        },
        {
            moduleNumber: 'Module 3',
            title: 'Logical & Statistical Functions',
            duration: 'Excel',
            topics: [
                'IF, nested IF and IFS',
                'AND, OR, NOT, IFERROR',
                'COUNTIF(S), SUMIF(S), AVERAGEIF(S)',
                'MAXIFS and MINIFS',
                'Statistical functions: MEDIAN, MODE, STDEV, PERCENTILE',
                'Date functions: TODAY, DATEDIF, EOMONTH, NETWORKDAYS'
            ]
        },
        {
            moduleNumber: 'Module 4',
            title: 'Lookup & Dynamic Array Functions',
            duration: 'Excel',
            topics: [
                'VLOOKUP and HLOOKUP',
                'INDEX and MATCH',
                'XLOOKUP and XMATCH',
                'FILTER, SORT, SORTBY, UNIQUE',
                'SEQUENCE and spill ranges',
                'LET and LAMBDA functions',
                'INDIRECT and OFFSET'
            ]
        },
        {
            moduleNumber: 'Module 5',
            title: 'PivotTables & PivotCharts',
            duration: 'Excel',
            topics: [
                'Creating PivotTables',
                'Grouping dates and numbers',
                'Calculated fields and items',
                'Show Values As (% of total, running total)',
                'Slicers and Timelines',
                'PivotCharts',
                'Refreshing and changing data source'
            ]
        },
        {
            moduleNumber: 'Module 6',
            title: 'Data Visualization in Excel',
            duration: 'Excel',
            topics: [
                'Choosing the right chart type',
                'Column, bar, line and pie charts',
                'Combo and dual-axis charts',
                'Sparklines',
                'Conditional formatting and icon sets',
                'Waterfall, histogram and map charts'
            ]
        },
        {
            moduleNumber: 'Module 7',
            title: 'Power Query (Get & Transform)',
            duration: 'Excel',
            topics: [
                'Importing data from CSV, Excel, folder and web',
                'Power Query Editor interface',
                'Transforming columns and data types',
                'Merge and Append queries',
                'Pivot and Unpivot',
                'Applied steps and query refresh'
            ]
        },
        {
            moduleNumber: 'Module 8',
            title: 'Power Pivot & Data Modeling',
            duration: 'Excel',
            topics: [
                'Introduction to the Data Model',
                'Creating relationships between tables',
                'Star schema basics',
                'Introduction to DAX in Power Pivot',
                'Measures vs calculated columns',
                'Building multi-table PivotTables'
            ]
        },
        {
            moduleNumber: 'Module 9',
            title: 'What-If Analysis & Automation',
            duration: 'Excel',
            topics: [
                'Goal Seek',
                'Scenario Manager',
                'Data Tables (one and two variable)',
                'Solver add-in',
                'Recording macros',
                'Introduction to VBA'
            ]
        },
        {
            moduleNumber: 'Module 10',
            title: 'Excel Dashboard Project',
            duration: 'Excel',
            topics: [
                'Dashboard planning and KPI selection',
                'Designing layout and theme',
                'Interactive dashboard with slicers',
                'Dynamic charts using formulas',
                'Protecting sheets and sharing',
                'Capstone: end-to-end sales dashboard'
            ]
        },
        {
            moduleNumber: 'Module 11',
            title: 'Introduction to Power BI',
            duration: 'Power BI',
            topics: [
                'What is Business Intelligence',
                'Power BI Desktop, Service and Mobile',
                'Installing Power BI Desktop',
                'Power BI interface: Report, Data, Model views',
                'Power BI workflow: Get data to Publish'
            ]
        },
        {
            moduleNumber: 'Module 12',
            title: 'Data Connection & Power Query',
            duration: 'Power BI',
            topics: [
                'Connecting to Excel, CSV, SQL and web sources',
                'Import vs DirectQuery modes',
                'Power Query Editor transformations',
                'Merge and Append queries',
                'Pivot, Unpivot and column splitting',
                'Custom and conditional columns',
                'Parameters and query folding',
                'Introduction to M language'
            ]
        },
        {
            moduleNumber: 'Module 13',
            title: 'Data Modeling',
            duration: 'Power BI',
            topics: [
                'Fact and dimension tables',
                'Star and snowflake schema',
                'Relationships and cardinality',
                'Cross-filter direction',
                'Creating a Date (calendar) table',
                'Hierarchies',
                'Model optimization best practices'
            ]
        },
        {
            moduleNumber: 'Module 14',
            title: 'DAX Fundamentals',
            duration: 'Power BI',
            topics: [
                'DAX syntax and data types',
                'Calculated columns vs measures',
                'Aggregation functions: SUM, AVERAGE, COUNT, DISTINCTCOUNT',
                'Iterator functions: SUMX, AVERAGEX',
                'Logical functions: IF, SWITCH',
                'Text and date functions in DAX'
            ]
        },
        {
            moduleNumber: 'Module 15',
            title: 'Advanced DAX',
            duration: 'Power BI',
            topics: [
                'Row context vs filter context',
                'CALCULATE and context transition',
                'FILTER, ALL, ALLEXCEPT, REMOVEFILTERS',
                'Time intelligence: TOTALYTD, SAMEPERIODLASTYEAR, DATEADD',
                'Variables (VAR / RETURN)',
                'RANKX and TOPN',
                'RELATED and RELATEDTABLE',
                'USERELATIONSHIP and inactive relationships'
            ]
        },
        {
            moduleNumber: 'Module 16',
            title: 'Data Visualization & Report Design',
            duration: 'Power BI',
            topics: [
                'Core visuals: bar, line, area, pie, donut',
                'Table, matrix and card visuals',
                'Maps and geo visuals',
                'KPI and gauge visuals',
                'Slicers and filters pane',
                'Conditional formatting',
                'Themes and report layout design',
                'Custom visuals from AppSource'
            ]
        },
        {
            moduleNumber: 'Module 17',
            title: 'Interactive & Advanced Reports',
            duration: 'Power BI',
            topics: [
                'Drill-down and drill-through',
                'Bookmarks and Selection pane',
                'Buttons and page navigation',
                'Custom tooltips',
                'Field parameters and What-If parameters',
                'Smart visuals: Key Influencers, Decomposition Tree and Q&A'
            ]
        },
        {
            moduleNumber: 'Module 18',
            title: 'Power BI Service & Collaboration',
            duration: 'Power BI',
            topics: [
                'Publishing reports to Power BI Service',
                'Workspaces and apps',
                'Dashboards and pinning tiles',
                'Scheduled refresh and Gateway',
                'Sharing and permissions',
                'Subscriptions and alerts'
            ]
        },
        {
            moduleNumber: 'Module 19',
            title: 'Security & Performance',
            duration: 'Power BI',
            topics: [
                'Row-Level Security (static and dynamic)',
                'Testing roles',
                'Performance Analyzer',
                'Reducing model size',
                'Incremental refresh basics'
            ]
        },
        {
            moduleNumber: 'Module 20',
            title: 'Power BI Capstone Project',
            duration: 'Power BI',
            topics: [
                'Business requirement gathering',
                'Data preparation and modeling',
                'DAX measures for KPIs',
                'Multi-page interactive report',
                'Publishing and presenting insights'
            ]
        },
        {
            moduleNumber: 'Module 21',
            title: 'Introduction to Tableau',
            duration: 'Tableau',
            topics: [
                'What is Tableau and its products',
                'Installing Tableau Public / Desktop',
                'Tableau interface and workspace',
                'Dimensions vs Measures',
                'Discrete vs Continuous fields'
            ]
        },
        {
            moduleNumber: 'Module 22',
            title: 'Connecting & Preparing Data',
            duration: 'Tableau',
            topics: [
                'Connecting to Excel and CSV',
                'Live vs Extract connections',
                'Data Source page and field types',
                'Joins, Unions and Relationships',
                'Data Interpreter and renaming fields'
            ]
        },
        {
            moduleNumber: 'Module 23',
            title: 'Basic Charts',
            duration: 'Tableau',
            topics: [
                'Bar and column charts',
                'Line charts',
                'Pie charts',
                'Text tables and highlight tables',
                'Scatter plots',
                'Maps (symbol and filled)'
            ]
        },
        {
            moduleNumber: 'Module 24',
            title: 'Filters, Sorting & Calculations',
            duration: 'Tableau',
            topics: [
                'Filters and quick filters',
                'Sorting and grouping',
                'Sets and hierarchies',
                'Basic calculated fields',
                'Quick table calculations'
            ]
        },
        {
            moduleNumber: 'Module 25',
            title: 'Dashboards & Stories',
            duration: 'Tableau',
            topics: [
                'Creating a dashboard',
                'Layout containers and formatting',
                'Dashboard actions (filter, highlight)',
                'Creating Stories',
                'Publishing to Tableau Public'
            ]
        }
    ]
};

// ── PARKED: Moon Coder's previous curriculum ────────────────────────────────
// Moon Coder used to be a single 14-module core problem-solving and DSA track
// with a weekly contest-upsolving timeline. VVITU replaced it with the four
// industry tracks above. Kept intact rather than deleted — it is a lot of
// authored content, and restoring it is one line in the `courses` array below.
// Note it carries `contest`, which is what renders the highlighted
// "Contest Upsolving" tab in the syllabus modal.
const COURSE_MOON_DSA_MASTERY = {
    id: 'moon-dsa-mastery',
    title: 'Core Problem Solving & DSA Readiness',
    level: '',
    prerequisites: 'Beginner Friendly — Designed for BTech Coursework Pace',
    overview: 'Sequential 14-module coverage from Arrays and Strings through Math, Sorting, Searching, Hashing, Linked Lists, Stacks, Queues, Two Pointers, and Backtracking — paired with weekly contest upsolving on CodeChef and LeetCode.',
    // The program's specialty — rendered as the highlighted "Contest Upsolving" tab.
    contest: MOON_CONTEST,
    outcomes: [
        'Compete every week on CodeChef and LeetCode, then upsolve what you missed',
        'Solve standard problems in Arrays, Strings, Math, Sorting, and Searching',
        'Implement core data structures: HashMaps, Linked Lists, Stacks, and Queues',
        'Apply algorithmic patterns: Two Pointers, Sliding Window, Prefix Sum, and Backtracking',
        'Build strong problem-solving foundations ready for competitive coding'
    ],
    modules: [
        {
            moduleNumber: 'Module 1',
            title: 'Arrays',
            duration: 'Core',
            topics: [
                '1D Arrays & Memory Layout',
                '2D Arrays & Matrix Traversals',
                'Basic Array Manipulations & Problem Solving'
            ]
        },
        {
            moduleNumber: 'Module 2',
            title: 'Strings',
            duration: 'Core',
            topics: [
                'String Basics & Memory Representation',
                'String Manipulation Problems',
                'Palindrome Checking & Pattern Matching'
            ]
        },
        {
            moduleNumber: 'Module 3',
            title: 'Math & Number Problems',
            duration: 'Core',
            topics: [
                'Number Theory & Digit Extraction Problems',
                'Basic Math: GCD, LCM, Series & Prime Numbers'
            ]
        },
        {
            moduleNumber: 'Module 4',
            title: 'Time & Space Complexity',
            duration: 'Core',
            topics: [
                'Big-O Notation Fundamentals',
                'Analyzing Loops, Nested Loops & Space Constraints'
            ]
        },
        {
            moduleNumber: 'Module 5',
            title: 'Recursion',
            duration: 'Core',
            topics: [
                'Recursion Fundamentals & Call Stack Memory',
                'Array & String Recursion Problems',
                'Introduction to Basic Backtracking'
            ]
        },
        {
            moduleNumber: 'Module 6',
            title: 'Bit Manipulation (Basic)',
            duration: 'Core',
            topics: [
                'Bitwise Operators (&, |, ^, ~, <<, >>)',
                'Bitwise Masking & Problem Solving Basics'
            ]
        },
        {
            moduleNumber: 'Module 7',
            title: 'Sorting',
            duration: 'Core',
            topics: [
                'Bubble Sort Algorithm',
                'Selection Sort Algorithm',
                'Insertion Sort Algorithm'
            ]
        },
        {
            moduleNumber: 'Module 8',
            title: 'Searching',
            duration: 'Core',
            topics: [
                'Linear Search Implementation',
                'Binary Search Fundamentals & Iterative / Recursive Logic'
            ]
        },
        {
            moduleNumber: 'Module 9',
            title: 'Hashing',
            duration: 'Core',
            topics: [
                'HashMap & HashSet Architecture',
                'Frequency Counting & Fast Lookup Problems'
            ]
        },
        {
            moduleNumber: 'Module 10',
            title: 'Linked List',
            duration: 'Core',
            topics: [
                'Singly Linked List (Creation, Insertion, Deletion)',
                'Doubly Linked List Implementation',
                'Core Problems: Traversal, Reversal & Cycle Detection'
            ]
        },
        {
            moduleNumber: 'Module 11',
            title: 'Stack',
            duration: 'Core',
            topics: [
                'Stack Concepts & Array/Linked List Implementation',
                'Basic Applications (Balanced Parentheses & Evaluation)'
            ]
        },
        {
            moduleNumber: 'Module 12',
            title: 'Queue',
            duration: 'Core',
            topics: [
                'Queue Concept & Implementation',
                'Circular Queue & Deque Basics'
            ]
        },
        {
            moduleNumber: 'Module 13',
            title: 'Two Pointer & Sliding Window',
            duration: 'Core',
            topics: [
                'Two Pointer Technique (Opposite Ends & Same Direction)',
                'Sliding Window Technique (Fixed & Dynamic Window)',
                'Prefix Sum Basics & Subarray Problems'
            ]
        },
        {
            moduleNumber: 'Module 14',
            title: 'Backtracking',
            duration: 'Core',
            topics: [
                'Subsets & Permutations Generation',
                'Basic Grid & Matrix Path Backtracking'
            ]
        }
    ]
};

const programsData = [
    {
        id: 'bamboo',
        icon: '🎋',
        name: 'Bamboo Coder',
        year: '1st Year',
        banner: '/assets/images/vvitu/project-images/Torii_Program_banners/Bamboo_Coder.png',
        tagline: 'Coding Foundation from Scratch',
        description: 'Build your programming foundation with core computer science principles, problem-solving mindset, and hands-on coding in C.',
        badge: 'Foundation Track',
        themeColor: 'var(--vvitu-primary)',
        accentBg: 'var(--vvitu-bg-coral-tint)',
        // Not on offer yet: the card renders without a status badge or year
        // pill, and its Explore Syllabus button is replaced by the Coming Soon
        // button. Drop this flag to bring the card fully back.
        comingSoon: true,
        courses: [
            {
                id: 'bamboo-c',
                title: 'C Programming & Logic Building',
                level: 'Beginner to Intermediate',
                // prerequisites: 'None — Designed for B.Tech 1st Year Students', // hidden: no real prerequisite to show for this course
                overview: 'Master foundational computer science concepts, memory layout, pointer arithmetic, structures, arrays, strings and pointer-driven C programs.',
                outcomes: [
                    'Write, debug, and compile clean, modular C programs independently',
                    'Apply control structures, loops, and functions to solve logical and aptitude problems',
                    'Work confidently with 1D/2D arrays, strings, pointer arithmetic, and dynamic memory',
                    'Use structures and arrays of structures to model real-world data',
                    'Solve arithmetic, digit, array, string and pointer problems with confidence'
                ],
                modules: [
                    {
                        moduleNumber: 'Module 1',
                        title: 'Programming Fundamentals',
                        topics: [
                            'Installing C Compiler & IDE Setup',
                            'Basic Structure of a C Program',
                            'Variables & Data Types',
                            'Input & Output',
                            'Operators',
                            'Problem Solving on Arithmetic'
                        ]
                    },
                    {
                        moduleNumber: 'Module 2',
                        title: 'Conditional Statements',
                        topics: [
                            'If Statement',
                            'If-Else & Else-If Ladder',
                            'Nested If',
                            'Switch Case',
                            'Problem Solving on Conditional Statements'
                        ]
                    },
                    {
                        moduleNumber: 'Module 3',
                        title: 'Loops & Number Problems',
                        topics: [
                            'For Loop',
                            'While & Do-While Loop',
                            'Nested Loops',
                            'Digit Problems',
                            'Prime Numbers',
                            'Factors, GCD & LCM',
                            'Problem Solving on Digits & Numbers'
                        ]
                    },
                    {
                        moduleNumber: 'Module 4',
                        title: 'Functions & Recursion',
                        topics: [
                            'Introduction to Functions',
                            'Writing Basic Functions',
                            'Parameters & Return Values',
                            'Recursion',
                            'Problem Solving on Functions & Recursion'
                        ]
                    },
                    {
                        moduleNumber: 'Module 5',
                        title: 'Arrays',
                        topics: [
                            'Introduction to Arrays',
                            'Array Input, Output & Traversal',
                            'Searching & Sorting',
                            'Problem Solving on Arrays'
                        ]
                    },
                    {
                        moduleNumber: 'Module 6',
                        title: '2D Arrays',
                        topics: [
                            'Introduction to 2D Arrays',
                            'Matrix Input & Output',
                            'Matrix Operations',
                            'Problem Solving on 2D Arrays'
                        ]
                    },
                    {
                        moduleNumber: 'Module 7',
                        title: 'Strings',
                        topics: [
                            'Introduction to Strings',
                            'String Input & Output',
                            'String Functions',
                            'Problem Solving on Strings'
                        ]
                    },
                    {
                        moduleNumber: 'Module 8',
                        title: 'Pointers',
                        topics: [
                            'Introduction to Pointers',
                            'Call by Value & Call by Reference',
                            'Pointers with Arrays & Strings',
                            'Dynamic Memory Allocation',
                            'Problem Solving on Pointers'
                        ]
                    },
                    {
                        moduleNumber: 'Module 9',
                        title: 'Structures',
                        topics: [
                            'Introduction to Structures',
                            'Array of Structures',
                            'Pointers to Structures',
                            'Problem Solving on Structures'
                        ]
                    }
                ],
                journey: BAMBOO_ROADMAP
            }
        ]
    },
    {
        id: 'skillup',
        icon: '📈',
        name: 'SkillUp Coder',
        year: '2nd Year',
        banner: '/assets/images/vvitu/project-images/Torii_Program_banners/Skill_up_coder.png',
        tagline: 'Core Data Structures & Applied Algorithms',
        description: 'Level up with fundamental data structures, algorithm optimization, and interview-standard problem solving.',
        badge: 'Core Engineering Track',
        themeColor: 'var(--vvitu-secondary)',
        accentBg: 'var(--vvitu-bg-warm-tint)',
        // AI Ready is the only track on offer now, so SkillUp Coder reverts to
        // a Coming Soon card (see the note on the Bamboo Coder card).
        comingSoon: true,
        courses: [
            /* ==================================================================
               ARCHIVED — previous SkillUp 'DSA' & 'Problem Solving' syllabus.
               Preserved for rollback. If the new syllabus is not a good fit,
               revert by replacing the single merged skillup course below with these
               two archived course objects (and remove this comment wrapper).
               ================================================================== */
            /*
            {
                id: 'skillup-dsa',
                title: 'Data Structures & Algorithms (DSA)',
                code: 'SKL-201',
                duration: '80 Hours (11 Core Modules)',
                level: '',
                prerequisites: 'C / C++ or Java Fundamentals',
                overview: 'Comprehensive core DSA curriculum covering Big-O analysis, linear structures, trees, heaps, graphs, greedy methods, and foundational dynamic programming.',
                outcomes: [
                    'Analyze time and space complexity with Big-O notation',
                    'Implement Linked Lists, Stacks, Queues, Trees, and Graphs from scratch',
                    'Solve standard problems using Two Pointers, Sliding Window, and Hashing',
                    'Master Tree traversals, BST operations, BFS/DFS Graph traversals',
                    'Apply Greedy strategies, Recursion, and 1D Dynamic Programming',
                    'Crack product company technical online assessments (OA)'
                ],
                modules: [
                    {
                        moduleNumber: 'Module 1',
                        title: 'Complexity Analysis & Asymptotic Basics',
                        duration: '6 Hours',
                        topics: [
                            'Big-O, Big-Theta & Big-Omega Notations',
                            'Analyzing Linear & Nested Loop Complexities',
                            'Auxiliary Space vs Space Complexity Analysis'
                        ]
                    },
                    {
                        moduleNumber: 'Module 2',
                        title: 'Arrays & Matrix Foundations',
                        duration: '8 Hours',
                        topics: [
                            '1D Arrays & Memory Layout',
                            '2D Arrays & Matrix Traversals',
                            'Prefix Sum Arrays & Subarray Sum Problems'
                        ]
                    },
                    {
                        moduleNumber: 'Module 3',
                        title: 'Sorting & Searching Algorithms',
                        duration: '8 Hours',
                        topics: [
                            'Linear Search & Binary Search Fundamentals',
                            'Bubble Sort, Selection Sort & Insertion Sort',
                            'Merge Sort & Quick Sort Algorithmic Foundations'
                        ]
                    },
                    {
                        moduleNumber: 'Module 4',
                        title: 'Strings & Hashing Techniques',
                        duration: '8 Hours',
                        topics: [
                            'String Manipulation, Substrings & Palindrome Checking',
                            'HashMap & HashSet Architecture',
                            'Frequency Counting & Target Pair Lookup Problems'
                        ]
                    },
                    {
                        moduleNumber: 'Module 5',
                        title: 'Linked Lists (Singly, Doubly & Circular)',
                        duration: '8 Hours',
                        topics: [
                            'Singly Linked List: Insertion, Deletion & Traversal',
                            'Doubly & Circular Linked List Operations',
                            'Floyd\'s Cycle Detection & In-Place List Reversal'
                        ]
                    },
                    {
                        moduleNumber: 'Module 6',
                        title: 'Stacks & Queues',
                        duration: '6 Hours',
                        topics: [
                            'Stack Implementation & Balanced Parentheses Problem',
                            'Queue & Circular Queue Implementation',
                            'Deque & Introduction to Monotonic Stack Concepts'
                        ]
                    },
                    {
                        moduleNumber: 'Module 7',
                        title: 'Two Pointers & Sliding Window',
                        duration: '6 Hours',
                        topics: [
                            'Two Pointers Technique (Opposite Ends & Same Direction)',
                            'Fixed-Size vs Variable-Size Sliding Window',
                            'Maximum Subarray & Substring Problem Solving'
                        ]
                    },
                    {
                        moduleNumber: 'Module 8',
                        title: 'Recursion & Basic Backtracking',
                        duration: '8 Hours',
                        topics: [
                            'Recursion State Trees & Call Stack Principles',
                            'Subsets & Permutations Generation',
                            'Introduction to Grid & Board Backtracking'
                        ]
                    },
                    {
                        moduleNumber: 'Module 9',
                        title: 'Trees & Binary Search Trees (BST)',
                        duration: '8 Hours',
                        topics: [
                            'Binary Tree Traversals (In-order, Pre-order, Post-order, Level-order)',
                            'Binary Search Trees: Search, Insert & Delete Operations',
                            'Tree Height, Diameter & Lowest Common Ancestor (LCA)'
                        ]
                    },
                    {
                        moduleNumber: 'Module 10',
                        title: 'Heaps & Graphs Fundamentals',
                        duration: '8 Hours',
                        topics: [
                            'Min-Heap & Max-Heap Basics & Priority Queues',
                            'Graph Representations (Adjacency Matrix & List)',
                            'Breadth-First Search (BFS) & Depth-First Search (DFS)'
                        ]
                    },
                    {
                        moduleNumber: 'Module 11',
                        title: 'Greedy Strategy & DP (Intro)',
                        duration: '6 Hours',
                        topics: [
                            'Greedy Choice Property & Classic Activity Selection',
                            'Memoization (Top-Down) vs Tabulation (Bottom-Up)',
                            '1D Dynamic Programming: Climbing Stairs & 0/1 Knapsack Intro'
                        ]
                    }
                ]
            },
            {
                id: 'skillup-problem-solving',
                title: 'Applied Problem Solving & Contest Training',
                code: 'SKL-202',
                duration: '50 Hours (4 Modules)',
                level: '',
                prerequisites: 'Core DSA Knowledge',
                overview: 'Targeted problem-solving bootcamp focused on pattern recognition, edge-case analysis, and speed on online coding platforms.',
                outcomes: [
                    'Recognize algorithmic patterns within 2 minutes of reading problem statements',
                    'Avoid Time Limit Exceeded (TLE) & Memory Limit Exceeded (MLE) traps',
                    'Implement space-optimized solutions in competitive contests',
                    'Compete in weekly coding contests with top percentile rankings'
                ],
                modules: [
                    {
                        moduleNumber: 'Module 1',
                        title: 'Arrays, Strings, Math & Hashing Patterns',
                        duration: '15 Hours',
                        topics: [
                            'Array Math & Frequency Counting with HashMaps',
                            'String Manipulations & Anagram Checking',
                            'Number Theory: GCD, Prime Sieve & Divisibility',
                            'Prefix Sum & Difference Array Optimizations'
                        ]
                    },
                    {
                        moduleNumber: 'Module 2',
                        title: 'Two Pointers & Sliding Window Mastery',
                        duration: '12 Hours',
                        topics: [
                            'Two Pointers (Opposite Ends & Fast-Slow)',
                            'Fixed-Size vs Variable-Size Sliding Window',
                            'Subarray Sum Problems & Target Sum Optimization',
                            'Merge Intervals & Meeting Rooms Pattern'
                        ]
                    },
                    {
                        moduleNumber: 'Module 3',
                        title: 'Binary Search, Sorting & Bitwise Tricks',
                        duration: '10 Hours',
                        topics: [
                            'Binary Search on Rotated & Infinite Arrays',
                            'Binary Search on Answer Space (Predicate Functions)',
                            'Custom Sorting & Comparator Logic',
                            'Bitmasking & Bitwise Operations for Quick Subsets'
                        ]
                    },
                    {
                        moduleNumber: 'Module 4',
                        title: 'Recursion, Backtracking & Contest Mock OAs',
                        duration: '13 Hours',
                        topics: [
                            'Subset & Permutation Generation',
                            'Matrix Path Finding & Board Backtracking',
                            'Timed 90-Minute Mock Online Assessments',
                            'Editorial Walkthroughs & Benchmark Analysis'
                        ]
                    }
                ]
            }
            */

            /* Single merged track — the former 'DSA' and 'Problem Solving'
               courses were combined into one 10-module curriculum (was 21
               modules across two courses) by pairing sibling topics and
               dropping duplicated ones. */
            COURSE_PROBLEM_SOLVING_DSA
        ]
    },
    {
        id: 'aiready',
        icon: '🤖',
        name: 'AI Ready Program',
        // Runs for 2nd years at VVITU (3rd years at SRKR). `year` is rendered
        // by the card's year pill, which raises the ordinal — "2nd Year" shows
        // as 2ⁿᵈ Year, not the shouty 2ND YEAR it used to be.
        year: '2nd Year',
        banner: '/assets/images/vvitu/project-images/Torii_Program_banners/AI_ready_eng.png',
        tagline: 'Industry-Ready Problem Solving & Development',
        description: 'Comprehensive industry preparation across problem solving and DSA, advanced competitive programming, full stack development and Google Flutter.',
        badge: 'Career & Industry Track',
        themeColor: 'var(--vvitu-tertiary)',
        accentBg: 'var(--vvitu-bg-warm-offwhite)',
        // The only intake VVITU is running. Paired with `open: true` on the
        // aiready program in lib/registration-schema.js, which is what the API
        // enforces (§8.1). The card id 'aiready' already matches the schema key.
        registrationsOpen: true,
        // Course order is the learning arc VVITU asked for: problem solving first,
        // then competitive depth, then the two build tracks. The first two are
        // shared objects (see the top of this file) also used by SkillUp Coder
        // and Owl Coder. To offer AWS Cloud/DevOps or ServiceNow again, add
        // COURSE_AWS_CLOUD_DEVOPS / COURSE_SERVICENOW back into this array.
        courses: [
            COURSE_PROBLEM_SOLVING_DSA,
            COURSE_ADVANCED_CP_DSA,
            COURSE_FULL_STACK,
            COURSE_GOOGLE_FLUTTER,
            {
                id: 'aiready-ai-engineer',
                title: 'AI Engineer',
                level: 'Beginner to Advanced',
                prerequisites: 'Basic Programming Fundamentals',
                overview: 'A 16-module path from how large language models actually work through to shipping agentic, retrieval-grounded AI systems in production.',
                outcomes: [
                    'Explain how large language models are built, trained and prompted',
                    'Use the everyday AI toolchain — Claude, Codex and Copilot — for real engineering work',
                    'Integrate AI models into applications through production-ready APIs',
                    'Build retrieval-augmented generation pipelines grounded in your own data',
                    'Design autonomous and multi-agent systems that plan, use tools and act',
                    'Deploy and scale AI applications securely on cloud platforms'
                ],
                modules: [
                    {
                        moduleNumber: 'Module 1',
                        title: 'LLM Foundation',
                        topics: [
                            'Understand how large language models work under the hood — architecture, training, and core capabilities.'
                        ]
                    },
                    {
                        moduleNumber: 'Module 2',
                        title: 'Generative AI',
                        topics: [
                            'Explore how generative models create text, images, and other content from a single prompt.'
                        ]
                    },
                    {
                        moduleNumber: 'Module 3',
                        title: 'AI Tools',
                        topics: [
                            'Hands-on with the everyday AI tools engineers use to think, build, and ship faster.'
                        ]
                    },
                    {
                        moduleNumber: 'Module 4',
                        title: 'Prompt Engineering',
                        topics: [
                            'Learn to write clear, structured prompts that get consistent, high-quality output from any model.'
                        ]
                    },
                    {
                        moduleNumber: 'Module 5',
                        title: 'GitHub & Version Control',
                        topics: [
                            'Master Git and GitHub workflows for tracking changes and collaborating on real codebases.'
                        ]
                    },
                    {
                        moduleNumber: 'Module 6',
                        title: 'Vibe Coding',
                        topics: [
                            'Build fast with AI pair-programming — describe intent, iterate, and ship working code.'
                        ]
                    },
                    {
                        moduleNumber: 'Module 7',
                        title: 'Database',
                        topics: [
                            'Core database design and querying skills every AI engineer needs to store and retrieve data.'
                        ]
                    },
                    {
                        moduleNumber: 'Module 8',
                        title: 'AI API Integration',
                        topics: [
                            'Connect AI models into real applications through clean, production-ready API integrations.'
                        ]
                    },
                    {
                        moduleNumber: 'Module 9',
                        title: 'RAG Systems',
                        topics: [
                            'Build retrieval-augmented generation pipelines that ground AI answers in your own data.'
                        ]
                    },
                    {
                        moduleNumber: 'Module 10',
                        title: 'AI Agents',
                        topics: [
                            'Design autonomous agents that plan, use tools, and complete multi-step tasks on their own.'
                        ]
                    },
                    {
                        moduleNumber: 'Module 11',
                        title: '3 C\'s — Claude · Codex · Copilot',
                        topics: [
                            'A hands-on tour of Claude, Codex, and Copilot — and when to reach for each one.'
                        ]
                    },
                    {
                        moduleNumber: 'Module 12',
                        title: 'AI Security',
                        topics: [
                            'Understand the security risks unique to AI systems and how to build against them.'
                        ]
                    },
                    {
                        moduleNumber: 'Module 13',
                        title: 'Agentic AI',
                        topics: [
                            'Go deeper into multi-agent systems that reason, collaborate, and act with real autonomy.'
                        ]
                    },
                    {
                        moduleNumber: 'Module 14',
                        title: 'Deployment',
                        topics: [
                            'Take AI applications from local prototype to a live, production deployment.'
                        ]
                    },
                    {
                        moduleNumber: 'Module 15',
                        title: 'LLM Creation',
                        topics: [
                            'Get under the hood of training and fine-tuning a language model from the ground up.'
                        ]
                    },
                    {
                        moduleNumber: 'Module 16',
                        title: 'Cloud AI',
                        topics: [
                            'Run and scale AI workloads on the cloud platforms powering modern AI products.'
                        ]
                    }
                ]
            }
        ]
    },
    {
        id: 'owlcoder',
        icon: '🦉',
        name: 'Owl Coder',
        year: 'Exclusive For 2028 Passouts',
        banner: '/assets/images/vvitu/project-images/Torii_Program_banners/Owlcoder.png',
        tagline: 'Elite Competitive Programming & Advanced DSA',
        description: 'An exclusive program for coding champions focusing on advanced algorithms, competitive programming, and high-package placement preparation.',
        badge: 'Elite Competitive Track',
        themeColor: 'var(--vvitu-primary)',
        accentBg: 'var(--vvitu-bg-coral-tint)',
        // Not on offer — Coming Soon card (see the note on the Bamboo Coder card).
        comingSoon: true,
        courses: [
            COURSE_ADVANCED_CP_DSA
        ]
    },
    {
        id: 'mooncoder',
        icon: '🌙',
        name: 'Moon Coder',
        // The pill that normally carries the passout year. VVITU asked for the
        // year NOT to appear on this card — this batch is defined by who it is
        // for, not by which year they are in — so the slot carries the
        // eligibility instead, and `yearHighlight` makes it an accent pill
        // rather than the usual neutral one. See .vvitu-program-year-pill.is-exclusive.
        year: 'Exclusive for Hostelers',
        yearHighlight: true,
        banner: '/assets/images/vvitu/project-images/Torii_Program_banners/Moon_coder.png',
        tagline: 'Full Stack, Flutter, ServiceNow & Data Analytics',
        description: 'A four-track industry skilling batch for hostelers — Full Stack Development, Google Flutter, ServiceNow Platform Engineering and Data Analytics. No AI modules: this is a core engineering and enterprise-platform track.',
        badge: 'Industry Skilling Track',
        themeColor: 'var(--vvitu-secondary)',
        accentBg: 'var(--vvitu-bg-warm-tint)',
        // OPEN. Per CLAUDE.md §8.1 this flag is only half of it — the other half
        // is `open: true` on the mooncoder entry in lib/registration-schema.js,
        // which is what actually lets the write through. Flip one without the
        // other and the card lies about the form, or the form about the card.
        registrationsOpen: true,
        registrationKey: 'mooncoder',
        courses: [
            COURSE_FULL_STACK,
            COURSE_GOOGLE_FLUTTER,
            COURSE_SERVICENOW,
            COURSE_DATA_ANALYTICS
        ]
    }
];

export default programsData;
