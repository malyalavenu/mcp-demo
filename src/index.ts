import search from 'arxiv-api-ts';
import { XMLParser } from 'fast-xml-parser';

interface PaperInfo {
  title: string;
  authors: string[];
  summary: string;
  pdf_url: string;
  published: string;
}

interface PapersInfo {
  [key: string]: PaperInfo;
}

export async function search_papers(topic: string, max_results: number = 5): Promise<PapersInfo> {
  /**
   * Search for papers on arXiv based on a topic and return their information.
   * 
   * @param topic - The topic to search for
   * @param max_results - Maximum number of results to retrieve (default: 5)
   * @returns Promise resolving to object with paper IDs as keys and paper info as values
   */
  try {
    // Use arxiv-api-ts to find the papers
    const response = await search.default({
      searchQueryParams: [{
        include: [{ name: topic }]
      }],
      maxResults: max_results,
      sortBy: 'relevance'
    });

    const papersInfo: PapersInfo = {};
    const papers = response.entries || [];
    for (const paper of papers) {
      const paperId = paper.id?.split('/').pop() || paper.id;
      let authors: string[] = [];
      let authorsArray: any[] = [];
      if (paper.authors) {
        if (Array.isArray(paper.authors)) {
          authorsArray = paper.authors;
        } else {
          authorsArray = [paper.authors];
        }
      }
      authors = authorsArray.map((author: any) => {
        return author && author.name ? author.name : '';
      }).filter(name => name !== '');
      const paperInfo: PaperInfo = {
        title: paper.title || '',
        authors: authors,
        summary: paper.summary || '',
        pdf_url: paper.pdf_url || '',
        published: paper.published ? new Date(paper.published).toISOString().split('T')[0] : ''
      };
      papersInfo[paperId] = paperInfo;
    }
    return papersInfo;
  } catch (error) {
    console.error('Error searching papers:', error);
    throw error;
  }
}

export async function extract_info(paper_id: string): Promise<string> {
  /**
   * Search for information about a specific paper by ID from arXiv.
   *
   * @param paper_id - The ID of the paper to look for
   * @returns Promise resolving to JSON string with paper information if found, error message if not found
   */
  try {
    // Fetch from arXiv API using id_list
    const apiUrl = `http://export.arxiv.org/api/query?id_list=${encodeURIComponent(paper_id)}`;
    const response = await fetch(apiUrl);
    const xml = await response.text();
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '', trimValues: true });
    const parsed = parser.parse(xml);
    const entries = parsed.feed && parsed.feed.entry ? (Array.isArray(parsed.feed.entry) ? parsed.feed.entry : [parsed.feed.entry]) : [];
    if (entries.length === 0) {
      return `No information found for paper ID ${paper_id}.`;
    }
    const entry = entries[0];
    // Return all info from the API for this entry
    return JSON.stringify(entry, null, 2);
  } catch (error) {
    console.error('Error extracting paper info:', error);
    return `Error: ${error}`;
  }
}

// --- Prompt Templates ---

/**
 * Generates a detailed prompt for tool selection and argument extraction.
 * @param toolList - A string describing the available tools and their arguments.
 * @param userQuery - The user's query string.
 * @returns The full prompt string for the LLM.
 */
export function getToolSelectionPrompt(toolList: string, userQuery: string): string {
  return `You are an expert assistant that helps users interact with a set of tools. Your job is to select the most appropriate tool for a given user query and extract the required arguments for that tool. You must always use the exact argument names and types as specified in the tool definitions.\n\nAvailable tools:\n${toolList}\n\nEach tool is described with its name, a description, and the arguments it accepts. For each argument, the type and a description are provided.\n\nGiven the following user query, select the most appropriate tool and extract the arguments from the query. Respond ONLY with a JSON object in the following format:\n\n{ \"tool\": <tool_name>, \"arguments\": { <argument_name>: <value>, ... } }\n\n- Use the exact argument names and types as specified.\n- If an argument is optional and not provided by the user, omit it from the arguments object.\n- Do not include any explanation or extra text.\n\nUser query: \"${userQuery}\"\n\nExamples:\n\nExample 1:\n- Tools:\n  - search_papers: Search for papers on arXiv. Arguments: { name (string): Topic to search for, max_results (number, optional): Maximum number of results }\n  - extract_info: Extract information from a paper. Arguments: { paper_id (string): ID of the paper }\n- User query: \"Find me the latest papers about quantum computing.\"\n- Output: { \"tool\": \"search_papers\", \"arguments\": { \"name\": \"quantum computing\" } }\n\nExample 2:\n- User query: \"Show me details for paper 1234.5678\"\n- Output: { \"tool\": \"extract_info\", \"arguments\": { \"paper_id\": \"1234.5678\" } }\n\nExample 3:\n- User query: \"List 10 papers about deep learning\"\n- Output: { \"tool\": \"search_papers\", \"arguments\": { \"name\": \"deep learning\", \"max_results\": 10 } }\n\nIf the user query does not match any tool, respond with:\n{ \"tool\": null, \"arguments\": {} }\n`;
}

