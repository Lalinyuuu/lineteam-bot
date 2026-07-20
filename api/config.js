// =========================
// Google Sheets
// =========================

export const SHEETS = {
  PROJECTS: "Projects",
  TASKS: "Tasks",
  WORKLOG: "WorkLog",
  CONTACTS: "Contacts",
  LOOKUP: "Lookup",
};

// =========================
// Project
// =========================

export const PROJECT_STATUS = {
  ACTIVE: "Active",
  ON_HOLD: "On Hold",
  CLOSED: "Closed",
};

// =========================
// Task
// =========================

export const TASK_STATUS = {
  TODO: "To Do",
  DOING: "Doing",
  WAITING: "Waiting",
  DONE: "Done",
  CANCELLED: "Cancelled",
};

export const PRIORITY = {
  CRITICAL: "Critical",
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
};

// =========================
// Category
// =========================

export const CATEGORY = {
  MEETING: "Meeting",
  REPORT: "Report",
  BA: "BA",
  SA: "SA",
  DEVELOPMENT: "Development",
  TESTING: "Testing",
  DEPLOYMENT: "Deployment",
  COORDINATION: "Coordination",
  DOCUMENT: "Document",
  ORACLE: "Oracle",
  INFRASTRUCTURE: "Infrastructure",
  FOCUS_GROUP: "Focus Group",
  SUPPORT: "Support",
  OTHER: "Other",
};

// =========================
// WorkLog
// =========================

export const ACTIVITY_TYPE = {
  RECEIVE: "Receive",
  WORKING: "Working",
  MEETING: "Meeting",
  COORDINATE: "Coordinate",
  CALL: "Call",
  EMAIL: "Email",
  REVIEW: "Review",
  UPDATE: "Update",
  WAITING: "Waiting",
  DONE: "Done",
  NOTE: "Note",
};

export const WORK_TYPE = {
  INTERNAL: "Internal",
  CUSTOMER: "Customer",
  VENDOR: "Vendor",
  DOCUMENTATION: "Documentation",
  DEVELOPMENT: "Development",
  MEETING: "Meeting",
  SUPPORT: "Support",
  TRAINING: "Training",
  RESEARCH: "Research",
  OTHER: "Other",
};

// =========================
// Default Values
// =========================

export const DEFAULTS = {
  PROJECT_STATUS: PROJECT_STATUS.ACTIVE,
  TASK_STATUS: TASK_STATUS.TODO,
  PRIORITY: PRIORITY.MEDIUM,
  PROGRESS: 0,
  TIMEZONE: "Asia/Bangkok",
};

// =========================
// Google Sheets Headers
// =========================

export const HEADERS = {
  PROJECTS: [
    "Project ID",
    "Project Code",
    "Project Name",
    "Description",
    "Project Manager",
    "Status",
    "Priority",
    "Start Date",
    "End Date",
    "Created At",
    "Updated At",
  ],

  TASKS: [
    "Task ID",
    "Project ID",
    "Parent Task ID",
    "Task Code",
    "Task Name",
    "Description",
    "Reference Link",
    "Category",
    "Owner",
    "Requested By",
    "Contact Person",
    "Status",
    "Progress (%)",
    "Priority",
    "Latest Update",
    "Next Step",
    "Waiting For",
    "Received Date",
    "Due Date",
    "Estimated Hours",
    "Actual Hours",
    "Created At",
    "Created By",
    "Updated At",
    "Updated By",
    "Closed At",
    "Closed By",
  ],

  WORKLOG: [
    "Log ID",
    "Task ID",
    "Project ID",
    "Created At",
    "Date",
    "Time",
    "Created By",
    "Activity Type",
    "Work Type",
    "Description",
    "From Person",
    "Contact Person",
    "Status After Update",
    "Progress After Update",
    "Duration (min)",
    "Remark",
  ],

  CONTACTS: [
    "Contact ID",
    "Name",
    "Nickname",
    "Team",
    "Company",
    "Position",
    "Phone",
    "Email",
    "LINE",
    "Remark",
    "Created At",
    "Updated At",
  ],
};