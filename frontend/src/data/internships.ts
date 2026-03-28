export interface Internship {
  id: string;
  title: string;
  location: string;
  duration: string;
  department: string;
  description: string;
  keywords: string[];
}

export const internships: Internship[] = [
  {
    id: "1",
    title: "Software Development Intern",
    location: "New Delhi",
    duration: "6 months",
    department: "Ministry of Electronics and IT",
    description: "Work on government digital initiatives and develop web applications for public services.",
    keywords: ["software", "programming", "development", "web", "javascript", "react", "python", "coding", "computer science"]
  },
  {
    id: "2",
    title: "Policy Research Intern",
    location: "Mumbai",
    duration: "3 months",
    department: "NITI Aayog",
    description: "Conduct research on public policy matters and assist in policy formulation.",
    keywords: ["policy", "research", "analysis", "economics", "political science", "governance", "public administration"]
  },
  {
    id: "3",
    title: "Data Analytics Intern",
    location: "Bangalore",
    duration: "6 months",
    department: "Ministry of Statistics",
    description: "Analyze large datasets to derive insights for policy decisions and public welfare programs.",
    keywords: ["data", "analytics", "statistics", "python", "machine learning", "sql", "visualization", "analysis"]
  },
  {
    id: "4",
    title: "Digital Marketing Intern",
    location: "New Delhi",
    duration: "4 months",
    department: "Ministry of Information & Broadcasting",
    description: "Create and manage digital campaigns for government schemes and initiatives.",
    keywords: ["marketing", "digital", "social media", "content", "communication", "advertising", "branding"]
  },
  {
    id: "5",
    title: "Environmental Research Intern",
    location: "Pune",
    duration: "5 months",
    department: "Ministry of Environment",
    description: "Support research on climate change, sustainability, and environmental conservation projects.",
    keywords: ["environment", "sustainability", "climate", "ecology", "conservation", "research", "biology"]
  },
  {
    id: "6",
    title: "UI/UX Design Intern",
    location: "Hyderabad",
    duration: "4 months",
    department: "Digital India Corporation",
    description: "Design user interfaces for government digital services and mobile applications.",
    keywords: ["design", "ui", "ux", "figma", "adobe", "user experience", "visual design", "prototype"]
  },
  {
    id: "7",
    title: "Finance & Accounts Intern",
    location: "New Delhi",
    duration: "6 months",
    department: "Ministry of Finance",
    description: "Assist in financial planning, budgeting, and accounting for government departments.",
    keywords: ["finance", "accounting", "budget", "economics", "commerce", "audit", "taxation"]
  },
  {
    id: "8",
    title: "Healthcare Administration Intern",
    location: "Chennai",
    duration: "5 months",
    department: "Ministry of Health",
    description: "Support healthcare policy implementation and hospital management initiatives.",
    keywords: ["healthcare", "medical", "health", "administration", "hospital", "public health", "medicine"]
  }
];
