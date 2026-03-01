export interface Course {
  id: string;
  name: string;
  description: string;
  icon: string;
  image: string;
}

export interface Material {
  id: string;
  courseId: string;
  title: string;
  type: 'pdf' | 'video';
  url: string;
  thumbnail?: string;
}

export const COURSES: Course[] = [
  { id: 'class-9', name: 'Class 9', description: 'Foundation for your academic journey.', icon: 'graduation-cap', image: 'https://picsum.photos/seed/class9/400/300' },
  { id: 'class-10', name: 'Class 10', description: 'Mastering the boards with confidence.', icon: 'book-open', image: 'https://picsum.photos/seed/class10/400/300' },
  { id: 'class-11', name: 'Class 11', description: 'Deepening concepts in core subjects.', icon: 'library', image: 'https://picsum.photos/seed/class11/400/300' },
  { id: 'class-12', name: 'Class 12', description: 'Final stride towards excellence.', icon: 'award', image: 'https://picsum.photos/seed/class12/400/300' },
  { id: 'neet', name: 'NEET', description: 'Your path to becoming a medical professional.', icon: 'heart-pulse', image: 'https://picsum.photos/seed/neet/400/300' },
  { id: 'jee', name: 'JEE', description: 'Engineering success through rigorous study.', icon: 'microscope', image: 'https://picsum.photos/seed/jee/400/300' },
];

export const STUDY_MATERIALS: Material[] = [
  { id: 'n1', courseId: 'class-10', title: 'Mathematics - Quadratic Equations', type: 'pdf', url: '#' },
  { id: 'n2', courseId: 'class-10', title: 'Science - Chemical Reactions', type: 'pdf', url: '#' },
  { id: 'v1', courseId: 'class-10', title: 'Introduction to Geometry', type: 'video', url: 'https://www.w3schools.com/html/mov_bbb.mp4', thumbnail: 'https://picsum.photos/seed/v1/640/360' },
  { id: 'n3', courseId: 'neet', title: 'Biology - Human Anatomy', type: 'pdf', url: '#' },
  { id: 'v2', courseId: 'neet', title: 'Organic Chemistry Basics', type: 'video', url: 'https://www.w3schools.com/html/mov_bbb.mp4', thumbnail: 'https://picsum.photos/seed/v2/640/360' },
];
