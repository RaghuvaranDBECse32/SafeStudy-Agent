import { QdrantClient } from '@qdrant/js-client-rest';

export interface StudyNote {
  id: string;
  topic: string;
  content: string;
}

export const SEED_DATASET: StudyNote[] = [
  // --- Original study notes ---
  {
    id: 'db-1',
    topic: 'Database Management Systems',
    content: 'Normalization organizes data to reduce redundancy in DBMS. It divides large tables into smaller ones and defines relationships between them.'
  },
  {
    id: 'db-2',
    topic: 'Database Management Systems',
    content: 'First Normal Form (1NF) removes repeating groups and enforces atomic values for each attribute. Every column must contain only single values.'
  },
  {
    id: 'db-3',
    topic: 'Database Management Systems',
    content: 'Second Normal Form (2NF) requires the table to be in 1NF and removes partial dependencies. All non-prime attributes must be fully functionally dependent on the primary key.'
  },
  {
    id: 'db-4',
    topic: 'Database Management Systems',
    content: 'Third Normal Form (3NF) requires 2NF and removes transitive dependencies. A non-prime attribute should not depend on another non-prime attribute.'
  },
  {
    id: 'os-1',
    topic: 'Operating Systems',
    content: 'Deadlock happens when two or more processes are unable to proceed because each is waiting for the other to release a resource.'
  },
  {
    id: 'os-2',
    topic: 'Operating Systems',
    content: 'Virtual Memory is a storage allocation scheme in which secondary memory can be addressed as though it were part of main memory.'
  },
  {
    id: 'net-1',
    topic: 'Computer Networks',
    content: 'TCP (Transmission Control Protocol) is connection-oriented, reliable, and guarantees ordered delivery of packets using a three-way handshake.'
  },
  {
    id: 'net-2',
    topic: 'Computer Networks',
    content: 'UDP (User Datagram Protocol) is connectionless, fast, and does not guarantee packet delivery or order, making it ideal for streaming.'
  },
  {
    id: 'algo-1',
    topic: 'Algorithms',
    content: 'Big O notation is used to describe the upper bound of the execution time or space required by an algorithm in the worst-case scenario.'
  },
  {
    id: 'algo-2',
    topic: 'Algorithms',
    content: 'Binary Search has a time complexity of O(log n) and requires the array to be sorted before performing search operations.'
  },
  // --- User's additional static Q&A notes ---
  {
    id: 'qa-1',
    topic: 'DBMS',
    content: 'What is normalization in DBMS? Normalization is the process of organizing data to reduce redundancy and improve consistency.'
  },
  {
    id: 'qa-2',
    topic: 'DBMS',
    content: 'What is a primary key? A primary key uniquely identifies each record in a table.'
  },
  {
    id: 'qa-3',
    topic: 'Operating Systems',
    content: 'What is a thread? A thread is a lightweight unit of execution within a process.'
  },
  {
    id: 'qa-4',
    topic: 'Operating Systems',
    content: 'What is deadlock? Deadlock is a situation where processes wait forever for resources held by each other.'
  },
  {
    id: 'qa-5',
    topic: 'Computer Networks',
    content: 'What is the difference between TCP and UDP? TCP is connection-oriented and reliable, while UDP is faster and connectionless.'
  },
  {
    id: 'qa-6',
    topic: 'Computer Networks',
    content: 'What is the OSI model? The OSI model has seven layers that explain how network communication happens.'
  },
  {
    id: 'qa-7',
    topic: 'JavaScript',
    content: 'What is the JavaScript event loop? The event loop handles asynchronous callbacks and keeps JavaScript non-blocking.'
  },
  {
    id: 'qa-8',
    topic: 'Tools',
    content: 'What is Git? Git is a version control system used to track code changes.'
  },
  {
    id: 'qa-9',
    topic: 'Web',
    content: 'What is a REST API? A REST API is a way for systems to communicate over HTTP using standard methods.'
  },
  {
    id: 'qa-10',
    topic: 'Frontend',
    content: 'What is React? React is a JavaScript library for building user interfaces.'
  },
];

const COLLECTION_NAME = 'study_notes';

class QdrantService {
  private client: QdrantClient | null = null;
  private isMock = true;

  constructor() {
    const qdrantUrl = process.env.QDRANT_URL;
    const qdrantApiKey = process.env.QDRANT_API_KEY;

    if (qdrantUrl) {
      console.log(`[Qdrant] Connecting to Qdrant instance at ${qdrantUrl}...`);
      this.client = new QdrantClient({
        url: qdrantUrl,
        apiKey: qdrantApiKey || undefined,
      });
      this.isMock = false;
    } else {
      console.log('[Qdrant] No QDRANT_URL found in environment. Falling back to Local Mock Mode.');
    }
  }

  isMockMode(): boolean {
    return this.isMock;
  }

  async initializeCollection(): Promise<void> {
    if (this.isMock || !this.client) {
      console.log('[Qdrant Mock] Initialized local mock storage.');
      return;
    }

    try {
      // Check if collection exists
      const collections = await this.client.getCollections();
      const exists = collections.collections.some((c) => c.name === COLLECTION_NAME);

      if (!exists) {
        console.log(`[Qdrant] Collection "${COLLECTION_NAME}" not found. Creating...`);
        // We use a simple 4-dimensional vector (or similar) since we are focusing on payload/keyword search
        // or a default 384-dimensional vector if users want to use standard embeddings.
        // Let's create it with 384 dimensions (standard for miniLM/all-MiniLM-L6-v2)
        await this.client.createCollection(COLLECTION_NAME, {
          vectors: {
            size: 384,
            distance: 'Cosine',
          },
        });
        console.log(`[Qdrant] Collection "${COLLECTION_NAME}" created successfully.`);
      } else {
        console.log(`[Qdrant] Collection "${COLLECTION_NAME}" already exists.`);
      }
    } catch (error) {
      console.error('[Qdrant] Error initializing collection, falling back to mock:', error);
      this.isMock = true;
    }
  }

  async seedNotes(notes: StudyNote[]): Promise<void> {
    if (this.isMock || !this.client) {
      console.log('[Qdrant Mock] Seeded local memory dataset.');
      return;
    }

    try {
      console.log(`[Qdrant] Seeding ${notes.length} notes...`);
      const points = notes.map((note, index) => {
        // Generate a simple dummy/pseudo-random vector of 384 dimensions
        // so we don't fail vector requirements while prioritizing payload queries.
        const vector = new Array(384).fill(0).map((_, i) => Math.sin(index + i) * 0.1);
        return {
          id: index + 1,
          vector,
          payload: {
            noteId: note.id,
            topic: note.topic,
            content: note.content,
          },
        };
      });

      await this.client.upsert(COLLECTION_NAME, {
        wait: true,
        points,
      });
      console.log('[Qdrant] Seeding completed.');
    } catch (error) {
      console.error('[Qdrant] Seeding failed:', error);
    }
  }

  async searchNotes(query: string): Promise<string[]> {
    if (this.isMock || !this.client) {
      console.log(`[Qdrant Mock] Searching local notes for query: "${query}"`);
      const lowerQuery = query.toLowerCase();
      // Filter notes that have keyword matches
      const matched = SEED_DATASET.filter((note) => {
        const words = lowerQuery.split(/\s+/).filter(w => w.length > 2);
        if (words.length === 0) return note.content.toLowerCase().includes(lowerQuery);
        return words.some((word) => note.content.toLowerCase().includes(word) || note.topic.toLowerCase().includes(word));
      });

      return matched.map((n) => `[Topic: ${n.topic}] ${n.content}`);
    }

    try {
      console.log(`[Qdrant] Querying collection for: "${query}"`);
      // Perform a search. Since we populated pseudo-random vectors, we can fetch all points
      // and perform filtering locally, or we can use Qdrant Scroll with payload filters.
      // A scroll is highly reliable when we don't have an embedding generator active.
      const result = await this.client.scroll(COLLECTION_NAME, {
        limit: 10,
        with_payload: true,
      });

      const lowerQuery = query.toLowerCase();
      const matchedPoints = result.points.filter((point) => {
        const payload = point.payload as { content?: string; topic?: string } | undefined;
        if (!payload) return false;
        const content = (payload.content || '').toLowerCase();
        const topic = (payload.topic || '').toLowerCase();
        const words = lowerQuery.split(/\s+/).filter(w => w.length > 2);
        if (words.length === 0) return content.includes(lowerQuery);
        return words.some((word) => content.includes(word) || topic.includes(word));
      });

      if (matchedPoints.length === 0) {
        // Fallback to returning any top 3 notes so the agent has some CS context
        return result.points.slice(0, 3).map((p) => {
          const payload = p.payload as any;
          return `[Topic: ${payload.topic}] ${payload.content}`;
        });
      }

      return matchedPoints.map((p) => {
        const payload = p.payload as any;
        return `[Topic: ${payload.topic}] ${payload.content}`;
      });
    } catch (error) {
      console.error('[Qdrant] Search failed, falling back to mock query:', error);
      // Fallback to local search
      this.isMock = true;
      return this.searchNotes(query);
    }
  }
}

export const qdrantService = new QdrantService();
