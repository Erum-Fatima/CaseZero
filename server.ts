import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Crucial: Increase JSON limit to handle base64 image data payload
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Helper to dynamically get the GoogleGenAI client with key fallback
  const getAiClient = () => {
    const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!key) {
      throw new Error("Gemini API key is missing from environment. Please configure GEMINI_API_KEY or GOOGLE_API_KEY in the Secrets / Settings panel of AI Studio.");
    }
    return new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  };

  // API Route for Analyzing Image
  app.post("/api/analyze-image", async (req, res) => {
    try {
      const { image, url } = req.body;
      if (!image && !url) {
        return res.status(400).json({ error: "No image source provided" });
      }

      let base64Data = "";
      let mimeType = "image/jpeg";

      if (image && image.startsWith("data:")) {
        const matches = image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          mimeType = matches[1];
          base64Data = matches[2];
        } else {
          return res.status(400).json({ error: "Invalid base64 image format" });
        }
      } else if (url) {
        if (url.startsWith("/")) {
          // Local relative path: read from public or dist folders
          const fs = await import("fs");
          const path = await import("path");
          const publicPath = path.join(process.cwd(), "public", url);
          const distPath = path.join(process.cwd(), "dist", url);
          let fsPath = publicPath;
          if (!fs.existsSync(publicPath) && fs.existsSync(distPath)) {
            fsPath = distPath;
          }
          if (fs.existsSync(fsPath)) {
            const fileBuffer = fs.readFileSync(fsPath);
            base64Data = fileBuffer.toString("base64");
            if (url.endsWith(".png")) {
              mimeType = "image/png";
            } else if (url.endsWith(".jpg") || url.endsWith(".jpeg")) {
              mimeType = "image/jpeg";
            } else if (url.endsWith(".webp")) {
              mimeType = "image/webp";
            }
          } else {
            throw new Error(`Local preset image not found at ${publicPath} or ${distPath}`);
          }
        } else {
          // Fetch external image
          const imgResponse = await fetch(url);
          if (!imgResponse.ok) {
            throw new Error(`Failed to fetch image from URL: ${url}`);
          }
          const contentType = imgResponse.headers.get("content-type");
          if (contentType) {
            mimeType = contentType;
          }
          const arrayBuffer = await imgResponse.arrayBuffer();
          base64Data = Buffer.from(arrayBuffer).toString("base64");
        }
      } else {
        return res.status(400).json({ error: "No valid image found" });
      }

      // Prompt for image classification and analysis complying strictly with instructions
      const systemInstruction = `
You are a strict JSON generator for civic issue classification.

You MUST return only valid JSON matching the schema.

Rules:
- No explanations
- No extra text
- No reasoning
- No formatting outside JSON
- Keep rootCause strictly physical and factual (1 sentence max)

Never output anything except JSON.
`;

      const prompt = `Return JSON only.`;

      // Call Gemini 3.5 Flash
      const aiClient = getAiClient();
      const response = await aiClient.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          {
            inlineData: {
              mimeType,
              data: base64Data
            }
          },
          {
            text: prompt
          }
        ],
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              issueType: {
                type: Type.STRING,
                description: "Type of civic issue (1 line)."
              },
              rootCause: {
                type: Type.STRING,
                description: "Simple physical/real-world explanation (1 sentence max). No mitigation, no future-proofing."
              },
              confidence: {
                type: Type.INTEGER,
                description: "Confidence percentage integer, 0 to 100."
              },
              department: {
                type: Type.STRING,
                description: "Single department name only."
              }
            },
            required: ["issueType", "rootCause", "confidence", "department"]
          }
        }
      });

      const resultText = response.text;
      if (!resultText) {
        throw new Error("No response text received from Gemini API");
      }

      const rawAnalysis = JSON.parse(resultText);

      // Map to standard civic department categories expected by the frontend
      const dept = rawAnalysis.department || "Infrastructure";
      const normalizedDept = 
        dept.toLowerCase().includes("sanitation") || dept.toLowerCase().includes("garbage") || dept.toLowerCase().includes("waste") ? "Sanitation" :
        dept.toLowerCase().includes("traffic") || dept.toLowerCase().includes("road") || dept.toLowerCase().includes("highway") ? "Traffic" :
        dept.toLowerCase().includes("safety") || dept.toLowerCase().includes("police") || dept.toLowerCase().includes("fire") ? "Public Safety" :
        dept.toLowerCase().includes("utility") || dept.toLowerCase().includes("electricity") || dept.toLowerCase().includes("water") || dept.toLowerCase().includes("power") ? "Utilities" :
        dept.toLowerCase().includes("environ") || dept.toLowerCase().includes("nature") || dept.toLowerCase().includes("park") ? "Environment" : "Infrastructure";

      const analysis = {
        title: rawAnalysis.issueType,
        category: rawAnalysis.issueType.toLowerCase().includes("pothole") ? "pothole" : 
                  rawAnalysis.issueType.toLowerCase().includes("garbage") || rawAnalysis.issueType.toLowerCase().includes("trash") ? "garbage" :
                  rawAnalysis.issueType.toLowerCase().includes("leak") || rawAnalysis.issueType.toLowerCase().includes("water") ? "water leakage" :
                  rawAnalysis.issueType.toLowerCase().includes("light") || rawAnalysis.issueType.toLowerCase().includes("street") ? "broken streetlight" :
                  rawAnalysis.issueType.toLowerCase().includes("drain") || rawAnalysis.issueType.toLowerCase().includes("sewer") ? "drainage issue" : "other",
        severity: "Medium",
        rootCause: rawAnalysis.rootCause,
        confidence: rawAnalysis.confidence,
        departmentCategory: normalizedDept
      };

      res.json(analysis);

    } catch (error: any) {
      console.error("Gemini analysis error:", error);
      res.status(500).json({ error: error.message || "Failed to analyze image with AI" });
    }
  });

  // API Route for Detecting Fake Resolution
  app.post("/api/detect-fake-resolution", async (req, res) => {
    try {
      const {
        caseTitle,
        caseDescription,
        category,
        reportedAt,
        resolvedAt,
        communityVerifications,
        upvotes,
        severity
      } = req.body;

      const systemInstruction = `
You are an AI civic audit assistant. Your job is to evaluate whether a reported civic issue's resolution is suspicious (e.g., fake, premature, or marked closed without real work).
Return only valid JSON matching the schema.

Rule constraints for marking suspicious:
1. Resolved within 1 hour of reporting.
2. Very few community verifications relative to severity (e.g., Critical/High severity with < 3 verifications).
3. The description suggests ongoing danger or complex repair that cannot be done in a brief timeframe.

Keep reasoning to exactly 1 or 2 sentences.
`;

      const prompt = `
Evaluate this case resolution:
Case Title: ${caseTitle}
Description: ${caseDescription}
Category: ${category}
Reported At: ${reportedAt}
Resolved At: ${resolvedAt}
Community Verifications: ${communityVerifications}
Upvotes: ${upvotes}
Severity: ${severity || "Medium"}

Return a JSON object conforming to the schema.
`;

      const aiClient = getAiClient();
      const response = await aiClient.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              isSuspicious: {
                type: Type.BOOLEAN,
                description: "Whether the resolution is suspicious."
              },
              confidenceScore: {
                type: Type.INTEGER,
                description: "Confidence percentage of the evaluation (0-100)."
              },
              reasoning: {
                type: Type.STRING,
                description: "Why this decision was made. Max 2 sentences."
              },
              verdict: {
                type: Type.STRING,
                description: "One of: 'CONFIRMED_RESOLVED' | 'SUSPICIOUS_CLOSURE' | 'NEEDS_REINVESTIGATION'"
              }
            },
            required: ["isSuspicious", "confidenceScore", "reasoning", "verdict"]
          }
        }
      });

      const resultText = response.text;
      if (!resultText) {
        throw new Error("No response text received from Gemini API");
      }

      const analysis = JSON.parse(resultText);
      res.json(analysis);
    } catch (error: any) {
      console.error("Fake resolution detection error:", error);
      res.status(500).json({ 
        error: error.message || "Failed to analyze resolution",
        details: error.stack || null
      });
    }
  });

  // API Route for Generating Collective Petition
  app.post("/api/generate-petition", async (req, res) => {
    try {
      const { wardName, councilor, cases } = req.body;
      if (!wardName || !councilor || !cases || !Array.isArray(cases)) {
        return res.status(400).json({ error: "Missing required parameters (wardName, councilor, cases)" });
      }

      const systemInstruction = `
You are an expert civic advocacy organizer and communication assistant. Your task is to draft a formal, powerful, yet polite collective civic petition letter addressed to the ward's councilor from "Concerned Residents of [wardName]".
Return only valid JSON matching the schema.

Guidelines for the letter:
1. Address the councilor directly by their name/title.
2. Formally declare the petition is from the "Concerned Residents of ${wardName}".
3. Reference all provided cases explicitly by their titles/names, detailing the current community impact.
4. Highlight that there are ${cases.length} unresolved, active issues in the district queue.
5. Include urgency language that is proportional to the combined severity of the issues (e.g., Critical/High issues should raise the alarm with highly urgent, safety-focused language).
6. End the letter with a firm but professional demand for an official administrative response or plan of action within exactly 7 days.
7. Make the body of the letter well-structured, formatted with line breaks, paragraphs, and a formal salutation and sign-off.
`;

      const prompt = `
Generate a collective petition for:
Ward District: ${wardName}
Councilor/Representative: ${councilor}
Active Unresolved Cases: ${JSON.stringify(cases)}

Return a JSON object matching the schema. Estimate the number of impacted residents based on the category, severity, and description of the issues.
`;

      const aiClient = getAiClient();
      const response = await aiClient.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              subject: {
                type: Type.STRING,
                description: "A compelling and formal email/letter subject line."
              },
              body: {
                type: Type.STRING,
                description: "The complete, formatted body of the petition letter, including salutation, structured paragraphs, bullet points referencing the issues, and formal sign-off."
              },
              urgencyLevel: {
                type: Type.STRING,
                description: "Determined urgency level based on the collective severity of open issues: 'LOW', 'MEDIUM', 'HIGH', or 'CRITICAL'."
              },
              estimatedImpactedResidents: {
                type: Type.INTEGER,
                description: "A calculated, plausible estimate of residents impacted by these persistent, unresolved issues."
              }
            },
            required: ["subject", "body", "urgencyLevel", "estimatedImpactedResidents"]
          }
        }
      });

      const resultText = response.text;
      if (!resultText) {
        throw new Error("No response text received from Gemini API");
      }

      const petition = JSON.parse(resultText);
      res.json(petition);
    } catch (error: any) {
      console.error("Petition generation error:", error);
      res.status(500).json({ error: error.message || "Failed to generate petition" });
    }
  });

  // API Route for Generating Public Escalation Post
  app.post("/api/generate-escalation-post", async (req, res) => {
    try {
      const {
        caseTitle,
        caseDescription,
        category,
        severity,
        wardName,
        councilor,
        daysUnresolved,
        communityVerifications
      } = req.body;

      if (!caseTitle || !wardName || !councilor) {
        return res.status(400).json({ error: "Missing required parameters (caseTitle, wardName, councilor)" });
      }

      const systemInstruction = `
You are a highly strategic and impactful civic mobilization communicator.
Your task is to generate public escalation drafts to raise community awareness and demand civic accountability.

For the short post (Twitter/X style):
- Must be strictly under 280 characters.
- Must be hard-hitting and viral-ready.
- Must publicly call out the unresponsive councilor by name.
- Must explicitly mention the issue/title, days unresolved, and the number of verified residents affected.

For the long post (Facebook/WhatsApp style):
- Needs to be highly detailed and persuasive.
- Must clearly outline the issue, call out the councilor by name, state the days unresolved, mention the community verifications, and demand urgent corrective action.
- Use formatting (like bold text or bullet points) suitable for message shares.

Return ONLY valid JSON matching the schema.
`;

      const prompt = `
Generate public escalation posts for the following case details:
Case Title: ${caseTitle}
Description: ${caseDescription}
Category: ${category}
Severity: ${severity}
Ward District: ${wardName}
Councilor/Representative: ${councilor}
Days Unresolved: ${daysUnresolved}
Verified Affected Residents: ${communityVerifications}

Return a JSON object matching the schema.
`;

      const aiClient = getAiClient();
      const response = await aiClient.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              shortPost: {
                type: Type.STRING,
                description: "A hard-hitting, viral-ready Twitter/X style social media post, strictly under 280 characters, calling out the councilor by name, mentioning the issue, days unresolved, and number of verified residents."
              },
              longPost: {
                type: Type.STRING,
                description: "A detailed and highly persuasive longer post for Facebook/WhatsApp outlining the issue, calling out the councilor, and demanding action."
              },
              hashtags: {
                type: Type.ARRAY,
                items: {
                  type: Type.STRING
                },
                description: "A list of relevant, high-impact civic accountability hashtags."
              }
            },
            required: ["shortPost", "longPost", "hashtags"]
          }
        }
      });

      const resultText = response.text;
      if (!resultText) {
        throw new Error("No response text received from Gemini API");
      }

      const escalationData = JSON.parse(resultText);
      res.json(escalationData);
    } catch (error: any) {
      console.error("Escalation post generation error:", error);
      res.status(500).json({ error: error.message || "Failed to generate escalation post" });
    }
  });

  // API health route
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
