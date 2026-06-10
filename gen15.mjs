import dagre from "dagre";
const API = "http://127.0.0.1:58321";
const EXT = "http://127.0.0.1:58322";
const code = "classDiagram\nclass Person {\n  +String name\n  +int age\n}\nclass Student {\n  +String studentId\n  +String major\n}\nclass Professor {\n  +String employeeId\n  +String department\n}\nclass Course {\n  +String courseCode\n  +String title\n  +int credits\n}\nclass Enrollment {\n  +String enrollmentId\n  +Date enrollDate\n}\nclass Department {\n  +String deptCode\n  +String deptName\n}\nclass Classroom {\n  +String roomCode\n  +int capacity\n}\nclass Schedule {\n  +String dayOfWeek\n  +String timeSlot\n}\nclass Exam {\n  +String examId\n  +Date examDate\n}\nclass Grade {\n  +String grade\n  +float score\n}\nclass Assignment {\n  +String assignId\n  +String title\n  +Date dueDate\n}\nclass Library {\n  +String libCode\n}\nclass Textbook {\n  +String isbn\n  +String author\n}\nclass ResearchPaper {\n  +String paperId\n  +String publisher\n}\nclass Project {\n  +String projectId\n  +String description\n}\nStudent <|-- Person\nProfessor <|-- Person\nStudent --> Enrollment\nProfessor --> Course\nCourse --> Enrollment\nDepartment --> Course\nDepartment --> Professor\nClassroom --> Schedule\nCourse --> Schedule\nCourse --> Exam\nEnrollment --> Grade\nCourse --> Assignment\nStudent --> Grade\nLibrary --> Textbook\nProfessor --> ResearchPaper\nStudent --> Project\nProfessor --> Project\nStudent ..> Library";
async function main() {
  console.log("1. Creating 15-class diagram...");
  let r = await fetch(API + "/generate_diagram", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code })
  });
  const t = await r.text();
  console.log("   ", r.ok ? "OK" : "FAIL - " + t);
  if (!r.ok) return;

  r = await fetch(API + "/get_all_diagrams_info", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: "{}"
  });
  const diags = (await r.json()).data;
  const diag = diags[diags.length - 1];
  const diagramId = diag.id;
  console.log("2. Diagram:", diag.name, diagramId);

  r = await fetch(EXT + "/get_diagram_views", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ diagramId })
  });
  const views = (await r.json()).data.views;
  const nodes = views.filter(v => v.kind === "node");
  console.log("3. Nodes:", nodes.length);

  const W = 180, H = 80;
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "LR", nodesep: 50, ranksep: 140, edgesep: 30, marginx: 50, marginy: 50 });
  const nodeMap = {};
  for (const v of nodes) { nodeMap[v.name] = v; g.setNode(v.name, { width: W, height: H }); }
  const pairs = [
    ["Student","Person"],["Professor","Person"],["Student","Enrollment"],
    ["Professor","Course"],["Course","Enrollment"],["Department","Course"],
    ["Department","Professor"],["Classroom","Schedule"],["Course","Schedule"],
    ["Course","Exam"],["Enrollment","Grade"],["Course","Assignment"],
    ["Student","Grade"],["Library","Textbook"],["Professor","ResearchPaper"],
    ["Student","Project"],["Professor","Project"],["Student","Library"]
  ];
  for (const [s,t] of pairs) { if (nodeMap[s] && nodeMap[t]) g.setEdge(s, t); }
  dagre.layout(g);

  let posCount = 0;
  for (const [name, view] of Object.entries(nodeMap)) {
    const dn = g.node(name);
    if (!dn) continue;
    const x = Math.round(dn.x - W / 2);
    const y = Math.round(dn.y - H / 2);
    const res = await fetch(EXT + "/update_view", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: view._id, left: x, top: y })
    });
    if ((await res.json()).success) posCount++;
  }
  console.log("4. Positions:", posCount, "/", nodes.length);

  r = await fetch(EXT + "/route_diagram_edges", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ diagramId })
  });
  const rt = (await r.json()).data;
  console.log("5. Edges:", rt.routed, "routed,", rt.failed, "failed");
  console.log("Done! Check StarUML.");
}
main().catch(e => { console.error("Error:", e.message); process.exit(1); });
