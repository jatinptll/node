/**
 * Google Classroom API client
 * Fetches courses and coursework (assignments) via REST API
 */

const CLASSROOM_BASE = 'https://classroom.googleapis.com/v1';

export interface ClassroomCourse {
    id: string;
    name: string;
    section?: string;
    descriptionHeading?: string;
    courseState: 'ACTIVE' | 'ARCHIVED' | 'PROVISIONED' | 'DECLINED' | 'SUSPENDED';
    alternateLink: string;
}

export interface ClassroomCoursework {
    id: string;
    courseId: string;
    title: string;
    description?: string;
    state: 'PUBLISHED' | 'DRAFT' | 'DELETED';
    alternateLink: string;
    dueDate?: {
        year: number;
        month: number;
        day: number;
    };
    dueTime?: {
        hours?: number;
        minutes?: number;
    };
    maxPoints?: number;
    workType: 'ASSIGNMENT' | 'SHORT_ANSWER_QUESTION' | 'MULTIPLE_CHOICE_QUESTION';
    creationTime: string;
    updateTime: string;
    scheduledTime?: string;
}

export interface ClassroomSubmission {
    id: string;
    courseWorkId: string;
    state: 'NEW' | 'CREATED' | 'TURNED_IN' | 'RETURNED' | 'RECLAIMED_BY_STUDENT';
    late: boolean;
    assignedGrade?: number;
}

async function classroomFetch<T>(endpoint: string, accessToken: string): Promise<T> {
    const response = await fetch(`${CLASSROOM_BASE}${endpoint}`, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(
            `Classroom API error (${response.status}): ${error.error?.message || response.statusText}`
        );
    }

    return response.json();
}

/**
 * Get all active courses for the authenticated user
 */
export async function getCourses(accessToken: string): Promise<ClassroomCourse[]> {
    const data = await classroomFetch<{ courses?: ClassroomCourse[] }>(
        '/courses?courseStates=ACTIVE&pageSize=30',
        accessToken
    );
    return data.courses || [];
}

/**
 * Get all coursework (assignments) for a specific course
 */
export async function getCoursework(
    courseId: string,
    accessToken: string
): Promise<ClassroomCoursework[]> {
    const data = await classroomFetch<{ courseWork?: ClassroomCoursework[] }>(
        `/courses/${courseId}/courseWork?courseWorkStates=PUBLISHED&pageSize=50&orderBy=dueDate asc`,
        accessToken
    );
    return data.courseWork || [];
}

/**
 * Get submission status for coursework items
 */
export async function getMySubmissions(
    courseId: string,
    courseWorkId: string,
    accessToken: string
): Promise<ClassroomSubmission[]> {
    const data = await classroomFetch<{ studentSubmissions?: ClassroomSubmission[] }>(
        `/courses/${courseId}/courseWork/${courseWorkId}/studentSubmissions?states=NEW&states=CREATED&states=TURNED_IN&states=RETURNED`,
        accessToken
    );
    return data.studentSubmissions || [];
}

/**
 * Fetch all courses with their coursework in one go
 */
export async function fetchAllClassroomData(accessToken: string) {
    const courses = await getCourses(accessToken);

    const coursesWithWork = await Promise.all(
        courses.map(async (course) => {
            try {
                const coursework = await getCoursework(course.id, accessToken);
                return { course, coursework };
            } catch (err) {
                console.warn(`Failed to fetch coursework for ${course.name}:`, err);
                return { course, coursework: [] as ClassroomCoursework[] };
            }
        })
    );

    return coursesWithWork;
}

/**
 * Convert Classroom dueDate to ISO date string (YYYY-MM-DD)
 */
export function formatClassroomDueDate(
    dueDate?: { year: number; month: number; day: number }
): string | undefined {
    if (!dueDate) return undefined;
    const { year, month, day } = dueDate;
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
