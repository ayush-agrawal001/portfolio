import { Icons } from "@/components/ui_portfolio_components/icons";
import { HomeIcon } from "lucide-react";

export const DATA = {
  name: "Ayush Agrawal",
  initials: "AA",
  url: "https://ayush-agrawal.in/",
  location: "India",
  locationLink: "https://www.google.com/maps/place/India",
  description:
    "Backend developer and automation engineer building Web3 apps and scalable platforms — currently shipping HR workflows at Botivate.",
  summary:
    "Backend developer currently building an external workforce management platform at Botivate — APIs, database models, authentication, and role-based access control for HR operations. Previously built trading infrastructure at Trench, and shipped several Web3 products on Solana (ChainGenie, a wallet, an on-chain credit-default-swap program). I care about clean backend architecture, automation, and shipping things that actually get used.",
  avatarUrl: "/profile_5.png",
  skills: [
    "React.js",
    "TypeScript",
    "Next.js",
    "Tailwind",
    "Node.js",
    "Express.js",
    "Passport.js",
    "OAuth",
    "Axios.js",
    "MongoDB",
    "PostgreSQL",
    "Recoil",
    "Zustand",
    "Web3.js",
    "WebRTC",
    "Socket.IO",
    "Firestore",
    "Python",
    "NumPy",
    "pandas",
    "Matplotlib",
    "Seaborn",
    "C",
    "Telegram Bot Development",
    "Cloudflare Workers",
    "Solidity",
    "Rust",
    "Anchor",
    "Google Apps Script",
    "Docker",
    "CI/CD",
    "Linux",
    "GCP",
  ],
  navbar: [
    { href: "/", icon: HomeIcon, label: "Home" },
  ],
  contact: {
    email: "ayushagrawal4376@gmail.com",
    tel: "+91-9575074847",
    social: {
      GitHub: {
        name: "GitHub",
        url: "https://github.com/ayush-agrawal001",
        icon: Icons.github,
        navbar: true,
      },
      LinkedIn: {
        name: "LinkedIn",
        url: "https://www.linkedin.com/in/ayush-agrawal-8813ab270/",
        icon: Icons.linkedin,
        navbar: true,
      },
      X: {
        name: "X",
        url: "https://x.com/bunnyTheRobo001",
        icon: Icons.x,
        navbar: true,
      },
      email: {
        name: "Send Email",
        url: "mailto:ayushagrawal4376@gmail.com",
        icon: Icons.email,
        navbar: false,
      },
    },
  },
  work: [
    {
      company: "Botivate",
      href: "https://www.botivate.in/",
      badges: [],
      location: "India · On-site",
      title: "Backend Developer (Intern)",
      logoUrl: "/botivate-logo.svg",
      start: "July 2026",
      end: "Present",
      description:
        "- Developing an external workforce management platform for HR operations.\n- Implementing backend APIs and database models for the platform.\n- Building authentication and role-based access control (RBAC).",
    },
    {
      company: "Trench",
      href: "https://www.trench.ag/",
      badges: [],
      location: "Remote",
      title: "Software Engineer Intern",
      logoUrl: "/trench_logo.svg",
      start: "April 2025",
      end: "Aug 2025",
      description:
        "- Developed and optimized landing pages with a strong focus on UI engineering and UX.\n- Integrated Hyperliquid APIs to enable trading functionality on the platform.\n- Built a trading terminal from scratch for spot and perpetual trading workflows.\n- Designed and organized backend APIs by functionality and use case.",
    },
  ],
  education: [
    {
      school: "Birla Institute of Technology and Science, Pilani",
      href: "https://www.bits-pilani.ac.in/",
      degree: "Bachelor's in Computer Science",
      logoUrl: "/BITS.png",
      start: "Aug 2024",
      end: "May 2027",
    },
  ],
  projects: [
    ////// ChainGenie //////
    {
      title: "ChainGenie",
      href: "#",
      dates: "November 2024",
      active: true,
      description:
        "- Built a secure Web3 Telegram bot that lets users create and manage Solana tokens and NFTs directly from Telegram.\n- Implemented minting and interaction workflows integrated with the Solana blockchain.\n- Designed the bot architecture with a focus on security, usability, and automation.",
      technologies: ["TypeScript", "Node.js", "Solana", "Telegraf"],
      links: [
        {
          type: "GitHub",
          href: "https://github.com/ayush-agrawal001/telegram_solana__token_and_NFT_launchpad",
          icon: <Icons.github className="size-3" />,
        },
        {
          type: "Announcement",
          href: "https://x.com/bunnyTheRobo001/status/1857200095756013841",
          icon: <Icons.react className="size-3" />,
        },
      ],
      image: "",
      video: "",
      xpost: "",
      ytvideo: "https://www.youtube.com/embed/Yz2QZPdyoVY?si=Po1wFvRF0Gzcf0gn",
    },
    ////// Jagruk //////
    {
      title: "Jagruk",
      href: "#",
      dates: "December 2024 - January 2025",
      active: true,
      description:
        "- Built a collaborative blogging platform where users publish posts, follow other bloggers, and join community discussions.\n- Implemented secure authentication using Google and GitHub OAuth.\n- Built the social layer (follows, content sharing) across a React frontend and a Node/Express + PostgreSQL backend.",
      technologies: [
        "React",
        "Node.js",
        "Express.js",
        "PostgreSQL",
        "Firebase",
        "Recoil",
      ],
      links: [
        {
          type: "GitHub",
          href: "https://github.com/ayush-agrawal001/Jagruk.life",
          icon: <Icons.github className="size-3" />,
        },
        {
          type: "Website",
          href: "https://jagruklife.vercel.app/",
          icon: <Icons.react className="size-3" />,
        },
      ],
      image: "",
      video: "",
      xpost: "",
      ytvideo: "https://www.youtube.com/embed/fEHCLybLMvM?si=E9V3tpK5D_TFdNFN",
    },
    ////// Credit Default Swap (RWA) Solana Program //////
    {
      title: "Credit Default Swap — RWA Program",
      href: "#",
      dates: "September 2025",
      active: true,
      description:
        "- Wrote a Solana on-chain program (Rust + Anchor) modeling a credit default swap agreement for real-world assets.\n- Used program-derived accounts (PDAs) to track proposal, approval, and premium-payment state for each agreement on-chain.\n- Minted an NFT via Anchor's SPL token interface to represent the signed agreement once approved.",
      technologies: ["Rust", "Anchor", "Solana", "TypeScript"],
      links: [
        {
          type: "GitHub",
          href: "https://github.com/ayush-agrawal001/Credit_default_swaps_RWA_Contract",
          icon: <Icons.github className="size-3" />,
        },
      ],
      image: "",
      video: "",
      xpost: "",
      ytvideo: "",
    },
    ////// Zenqor (client project) //////
    {
      title: "Zenqor — Client Website",
      href: "#",
      dates: "March 2025",
      active: true,
      description:
        "- Built the marketing website for Zenqor as freelance/contract work.\n- Implemented scroll-driven animations and page transitions across home, about, solutions, technology, and contact pages.\n- Delivered a fully responsive, production-ready site using Next.js and Framer Motion.",
      technologies: ["Next.js", "TypeScript", "Framer Motion", "Tailwind"],
      links: [
        {
          type: "GitHub",
          href: "https://github.com/ayush-agrawal001/zenqor",
          icon: <Icons.github className="size-3" />,
        },
      ],
      image: "",
      video: "",
      xpost: "",
      ytvideo: "",
    },
    ////// Invoice Automation //////
    {
      title: "Invoice & Billing Automation",
      href: "#",
      dates: "November 2024",
      active: true,
      description:
        "- Automated invoice generation and billing for a business using Google Apps Script wired to Google Sheets and an external invoicing API.\n- Validated customer PAN/GSTIN tax IDs and auto-split amounts over ₹50,000 into compliant chunks per Indian billing rules.\n- Removed manual invoice creation — generated invoice links and status are written back to the sheet automatically.",
      technologies: ["Google Apps Script", "JavaScript", "REST APIs"],
      links: [
        {
          type: "GitHub",
          href: "https://github.com/ayush-agrawal001/gscript-automating-invoices",
          icon: <Icons.github className="size-3" />,
        },
      ],
      image: "",
      video: "",
      xpost: "",
      ytvideo: "",
    },
    ////// Web3 Wallet - Vault //////
    {
      title: "Web3 Wallet - Vault",
      href: "#",
      dates: "September 2024",
      active: true,
      description:
        "- Built a secure Web3 wallet with seamless integration with the Solana blockchain.\n- Implemented key management and transaction signing flows in React + TypeScript.",
      technologies: ["React", "web3.js", "Solana", "TypeScript"],
      links: [
        {
          type: "GitHub",
          href: "https://github.com/ayush-agrawal001/SOL_WALLET",
          icon: <Icons.github className="size-3" />,
        },
        {
          type: "Website",
          href: "https://sol-wallet-bqh5.vercel.app/",
          icon: <Icons.react className="size-3" />,
        },
      ],
      image: "",
      video: "",
      xpost: "",
      ytvideo: "https://www.youtube.com/embed/qyqjAsXwtQ8?si=4D9bDnH-Kt5Dlq9M",
    },
    ////// Video-call web app //////
    {
      title: "Video-call web app",
      href: "#",
      dates: "October 2024",
      active: true,
      description:
        "- Built a real-time video calling platform using WebRTC and Socket.IO for low-latency peer-to-peer communication.\n- Implemented signaling, connection management, and audio/video streaming.",
      technologies: ["React", "WebRTC", "Socket.io"],
      links: [
        {
          type: "Github",
          href: "https://github.com/ayush-agrawal001/Video-chat-app",
          icon: <Icons.github className="size-3" />,
        },
      ],
      image: "",
      video: "",
      xpost: "",
      ytvideo: "https://www.youtube.com/embed/uuto1xwzJHA?si=r8AMGi55D24GxcBF",
    },
  ],
  credentials: [
    {
      title: "100xDevs — Complete Web Dev, DevOps & Blockchain Cohort",
      dates: "Completed",
      location: "Online",
      description:
        "Completed 100xDevs' full cohort covering web development, DevOps, and blockchain engineering end-to-end.",
      image: "/profile_5.png",
      links: [
        {
          title: "Course",
          icon: <Icons.globe className="h-4 w-4" />,
          href: "https://app.100xdevs.com/new-courses/complete-web-development-devops-blockchain-cohort",
        },
      ],
    },
    {
      title: "Turbin3 — Solana Async Builder Cohort",
      dates: "2025",
      location: "Remote",
      description:
        "Selected for Turbin3's Solana Async Builder cohort — completed hands-on Rust/Anchor program-building assignments and coursework.",
      image: "/profile_5.png",
      links: [
        {
          title: "GitHub",
          icon: <Icons.github className="h-4 w-4" />,
          href: "https://github.com/ayush-agrawal001/turbin3_bunny",
        },
      ],
    },
  ],
} as const;
