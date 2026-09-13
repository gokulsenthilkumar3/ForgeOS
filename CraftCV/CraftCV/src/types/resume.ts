export interface ResumeData {
  personal: {
    name: string;
    email: string;
    phone: string;
    location: string;
    linkedin?: string;
    github?: string;
    summary: string;
  };
  experience: {
    company: string;
    role: string;
    startDate: string;
    endDate: string;
    bullets: string[];
  }[];
  education: {
    institution: string;
    degree: string;
    year: string;
  }[];
  skills: string[];
}

export const emptyResume: ResumeData = {
  personal: { name: '', email: '', phone: '', location: '', summary: '' },
  experience: [],
  education: [],
  skills: [],
};
