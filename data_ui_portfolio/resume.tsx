import { Icons } from "@/components/ui_portfolio_components/icons";
import { HomeIcon, NotebookIcon } from "lucide-react";

export const DATA = {
  name: "Ayush Agrawal",
  initials: "AA",
  url: "https://ayush-agrawal.in/",
  location: "India",
  locationLink: "https://www.google.com/maps/place/India",
  description:
    "A passionate developer who loves building meaningful projects, learning new technologies, and contributing to the tech community.",
  summary:
    "Working as a Web3 Developer, exploring Solana and Ethereum development, and creating scalable web applications. With expertise in Full Stack Development and DevOps, I aim to deliver impactful projects like developer-centric apps and innovative hackathon ideas.",
  avatarUrl: "/profile_5.png",
  skills: [
    "React.js",
    "TypeScript",
    "Next.js",
    "Tailwind",
    "Node.js",
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
    "Docker",
    "CI/CD",
    "Linux",
    "GCP"
  ],
  navbar: [
    { href: "/", icon: HomeIcon, label: "Home" },
    { href: "/blog", icon: NotebookIcon, label: "Blog" },
  ],
  contact: {
    email: "ayushagrawal4376@gmail.com",
    tel: "+91-9876543210",
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
      // Youtube: {
      //   name: "YouTube",
      //   url: "https://youtube.com/@ayush-agrawal",
      //   icon: Icons.youtube,
      //   navbar: true,
      // },
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
      company: "Trench",
      href: "https://www.trench.ag/",
      badges: [],
      location: "Remote",
      title: "Full-Stack Software Engineer",
      logoUrl: "/trench_logo.svg",
      start: "April 2025",
      end: "Aug 2025",
      description:
        "Enabling Various methods and techniques of Trading in the Trench platform.",
    },
    {
      company: "Fibrotechs, Dubai",
      href: "https://www.fibrotechs.com/",
      badges: [],
      location: "Remote",
      title: "Freeelancing as Full-Stack Developer",
      logoUrl: "/fibrotechsLogo.png",
      start: "November 2024",
      end: "December 2024",
      description:
        "Website for the Fibrotechs company, provider of digital solutions for businesses and organizations.",
    },
  ],
  education: [
    {
      school: "Birla Institute of Technology and Science, Pilani",
      href: "https://www.bits-pilani.ac.in/",
      degree: "Bachelor's in Computer Science",
      logoUrl: "/BITS.png",
      start: "2023",
      end: "Ongoing",
    },
  ],
  projects: [
    {
      title: "Bridge ASQ tokens",
      href: "#",
      dates: "Feb 2025",
      active: false,
      description:
        "Bridge ASQ tokens between Polygon and Ethereum using the Bridge contract.",
      technologies: ["Solidity", "React.js", "Next.js", "Tailwind", "Node.js", "PostgreSQL"],
      links: [
        {
          type: "GitHub",
          href: "https://github.com/ayush-agrawal001/token_bridge",
          icon: <Icons.github className="size-3" />,
        },
      ],
      image: "",
      video: "",
      xpost : "",
      ytvideo : "https://www.youtube.com/embed/aHFEldW0sIE?si=k_q38F-HaCkeenLz",
    },
    ////// Jagruk //////
    {
      title: "Jagruk",
      href: "#",
      dates: "December 2024 - January 2025",
      active: true,
      description:
        "A platform for bloggers to connect, discuss projects, and collaborate using features like Google/GitHub authentication, follow other bloggers, and share posts.",
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
      xpost : "",
      ytvideo : "https://www.youtube.com/embed/fEHCLybLMvM?si=E9V3tpK5D_TFdNFN",
    },
    ////// ChainGenie //////
    {
      title: "ChainGenie",
      href: "#",
      dates: "November 2024",
      active: true,
      description:
        "A secure Web3 telegram bot allows users to create their own solana tokens and NFT's and interact with them.",
      technologies: ["TypeScript", "Node.js", "Telgraf"],
      links: [
        {
          type: "GitHub",
          href: "https://github.com/ayush-agrawal001/telegram_solana__token_and_NFT_launchpad",
          icon: <Icons.github className="size-3" />,
        },
        {
          type: "Website",
          href: "https://x.com/bunnyTheRobo001/status/1857200095756013841",
          icon: <Icons.react className="size-3" />,
        },
      ],
      image: "",
      video: "",
      xpost : "",
      ytvideo : "https://www.youtube.com/embed/Yz2QZPdyoVY?si=Po1wFvRF0Gzcf0gn",
    },
    ////// Fibrotech Home Page //////
    {
      title: "Fibrotech Home Page",
      href: "#",
      dates: "October 2024 - November 2024",
      active: true,
      description:
        "Designed and developed a website for Fibrotechs, a company that provides digital solutions for businesses and organizations.",
      technologies: ["React", "Tailwind", "TypeScript", "Shad CN"], 
      links: [
        {
          type: "Website",
          href: "https://fibrotechs.com",
          icon: <Icons.react className="size-3" />,
        },
      ],
      image: "",
      video: "",
      xpost : "",
      ytvideo : "https://www.youtube.com/embed/7y6C_Zd65k8?si=p095_1wuWzHwuO1M",
    },
    ////// Video-call web app //////
    {
      title: "Video-call web app",
      href: "#",
      dates: "October 2024",
      active: true,
      description:
        "Makig a platform for Face time video calls using WebRTC and Socket.io",
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
      xpost : "",
      ytvideo : "https://www.youtube.com/embed/uuto1xwzJHA?si=r8AMGi55D24GxcBF",
    },
    ////// Web3 Wallet - Vault //////
    {
      title: "Web3 Wallet - Vault",
      href: "#",
      dates: "September 2024",
      active: true,
      description:
        "A secure Web3 wallet with seamless integration with Solana blockchain.",
      technologies: ["React", "web3.js" ,"Solana", "TypeScript"],
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
      xpost : "",
      ytvideo : "https://www.youtube.com/embed/qyqjAsXwtQ8?si=4D9bDnH-Kt5Dlq9M",
    },
    ////// Platform Game //////
    {
      title: "Platform Game using Vanila JavaScript",
      href: "#",
      dates: "August 2024",
      active: true,
      description:
        "The game is a classic platformer where the player can move left, right and jump. Fall due to gravity. Restart the game upon falling off the screen.",
      technologies: ["HTML5 canvas", " Vanila JavaScript"],
      links: [
        {
          type: "GitHub",
          href: "https://github.com/ayush-agrawal001/Platformer-Game",
          icon: <Icons.github className="size-3" />,
        },
        {
          type: "Website",
          href: "https://ayush-agrawal001.github.io/Platformer-Game/",
          icon: <Icons.react className="size-3" />,
        },
      ],
      image: "",
      video: "",
      xpost : "",
      ytvideo : "https://www.youtube.com/embed/t5OFa35G0bA?si=Oboz_VksZEdeLd1H",
    },
    ////// Wave Animation //////
    {
      title: "Wave Animation using Vanila JavaScript",
      href: "#",
      dates: "August 2024",
      active: true,
      description:
        "animated wave on an HTML5 canvas, with adjustable parameters for the wave, stroke color, and background color using the dat.GUI library",
      technologies: ["HTML5 canvas", "Vanila JavaScript", "dat.GUI"],
      links: [
        {
          type: "GitHub",
          href: "https://github.com/ayush-agrawal001/wave-animation",
          icon: <Icons.github className="size-3" />,
        },
        {
          type: "Website",
          href: "https://ayush-agrawal001.github.io/wave-animation/",
          icon: <Icons.react className="size-3" />,
        },
      ],
      image: "",
      video: "",
      xpost : "",
      ytvideo : "https://www.youtube.com/embed/5ieO0U9_Z44?si=HbDj3RnKJjlJVv4_",
    },
    ////// Animated Website using Vanila JavaScript //////
    {
      title: "Animated Website using Vanila JavaScript",
      href: "#",
      dates: "August 2024",
      active: true,
      description:
        "A secure Web3 wallet with seamless integration with Solana blockchain.",
      technologies: ["Vanila JavaScript"],
      links: [
        {
          type: "GitHub",
          href: "https://github.com/ayush-agrawal001/Anim.ayush.website",
          icon: <Icons.github className="size-3" />,
        },
        {
          type: "Website",
          href: "https://ayush-agrawal001.github.io/Anim.ayush.website/",
          icon: <Icons.react className="size-3" />,
        },
      ],
      image: "",
      video: "",
      xpost : "",
      ytvideo : "https://www.youtube.com/embed/5YEh5pxltV8?si=SHXAv8Mq4IqMDnzS",
    },
  ],
  hackathons: [
    {
      title: "This Time line will Start with YOU!!",
      dates: "Present",
      location: "Online",
      description:
        "Contact Me and find the most suitable solution for you",
      image: "/solana-hackathon.png",
      links: [
        {
          title: "Twitter",
          icon: <Icons.x className="h-4 w-4" />,
          href: "https://x.com/bunnyTheRobo001",
        },
        {
          title: "LinkedIn",
          icon: <Icons.linkedin className="h-4 w-4" />,
          href: "https://www.linkedin.com/in/ayush-agrawal-8813ab270/",
        },
        {
          title: "GitHub",
          icon: <Icons.github className="h-4 w-4" />,
          href: "https://github.com/ayush-agrawal001",
        },
      ],
    },
  ],
} as const;
