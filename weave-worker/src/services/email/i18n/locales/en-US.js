/** @type {Record<string, string>} */
module.exports = {
  "common.brandName": "Weave Notes",
  "common.autoFooter":
    "This email was sent automatically. Please do not reply.",
  "common.ctaHint":
    "Use the button in this email to continue (open in your browser if needed).",
  "common.greetingFallback": "there",
  "common.username": "Username",
  "common.organization": "Organization",
  "common.role": "Role",
  "common.project": "Project",
  "common.note": "Note",
  "common.dueDate": "Due date",
  "common.currentEmail": "Current email",
  "common.newEmail": "New email",
  "common.format": "Format",
  "common.content": "Content",
  "common.formatCsv": "CSV (Excel/Google Sheets)",
  "common.contentNotesBlocks": "active notes and blocks",

  "welcome.preheader": "Activate your Weave Notes account.",
  "welcome.title": "Welcome to Weave Notes",
  "welcome.subtitle": "Account activation",
  "welcome.intro1": "Your account was created successfully.",
  "welcome.intro2":
    "To start using the platform, confirm your email with the button below.",
  "welcome.cta": "Activate account",
  "welcome.info": "This link expires in 7 days.",
  "welcome.outro1": "If you did not sign up, please ignore this email.",
  "welcome.footer":
    "You received this email because you created a Weave Notes account.",
  "welcome.subject": "Welcome to Weave Notes - Activate your account",

  "rescue.preheader": "Password reset request.",
  "rescue.title": "Password reset",
  "rescue.subtitle": "Account security",
  "rescue.intro1": "We received a request to reset your account password.",
  "rescue.intro2":
    "If you made this request, use the button below to continue.",
  "rescue.cta": "Reset password",
  "rescue.info": "This link expires in 1 hour.",
  "rescue.outro":
    "If you did not request this change, ignore this email. No changes will be made.",
  "rescue.subject": "Password reset - Weave Notes",

  "reset.preheader": "Confirm your account email change.",
  "reset.title": "Confirm email change",
  "reset.subtitle": "Account security",
  "reset.intro1": "We received a request to change your account email.",
  "reset.intro2": "Use the button below to validate this change.",
  "reset.cta": "Confirm new email",
  "reset.info": "This link expires in 1 hour.",
  "reset.outro":
    "If you did not request this change, please ignore this email.",
  "reset.subject": "Email change validation - Weave Notes",

  "deleteRequest.preheader": "Account deletion confirmation.",
  "deleteRequest.title": "Confirm account deletion",
  "deleteRequest.subtitle": "Irreversible action",
  "deleteRequest.intro1":
    "We received a request to permanently delete your account.",
  "deleteRequest.intro2":
    "If you want to proceed, confirm with the button below.",
  "deleteRequest.cta": "Confirm account deletion",
  "deleteRequest.info": "This link expires in 7 days ({expiration}).",
  "deleteRequest.bodyDetail":
    "After confirmation, your data and settings will be permanently removed.",
  "deleteRequest.outro":
    "If you did not request this deletion, ignore this email and consider changing your password.",
  "deleteRequest.footer":
    "You received this email because a deletion request was made for this account.",
  "deleteRequest.subject": "Account deletion confirmation - Weave Notes",

  "deleteMessage.preheader": "Your account was deleted successfully.",
  "deleteMessage.title": "Account deleted",
  "deleteMessage.subtitle": "Deletion confirmation",
  "deleteMessage.intro":
    "Your Weave Notes account was permanently deleted as requested.",
  "deleteMessage.bodyUser": "Removed user",
  "deleteMessage.bodyDetail": "All linked data was permanently erased.",
  "deleteMessage.outro":
    "If you do not recognize this action, contact our support immediately.",
  "deleteMessage.footer":
    "You received this email as confirmation of your account deletion.",
  "deleteMessage.subject": "Account deleted successfully - Weave Notes",

  "invite.preheader": "Invitation to join an organization.",
  "invite.title": "You have been invited",
  "invite.subtitle": "Organization invitation",
  "invite.intro": "{inviterName} invited you to join {organizationName}.",
  "invite.cta": "Accept invitation",
  "invite.info": "This invitation expires in 7 days.",
  "invite.subject": "Invitation to {organizationName} - Weave Notes",

  "inviteAccepted.preheader": "Invitation accepted successfully.",
  "inviteAccepted.title": "Welcome to {organizationName}",
  "inviteAccepted.subtitle": "Your account is ready",
  "inviteAccepted.intro1":
    "Your access was confirmed and you can now use Weave Notes.",
  "inviteAccepted.intro2": "Plan, execute, and collaborate in one place.",
  "inviteAccepted.cta": "Go to Home",
  "inviteAccepted.featuresIntro": "With Weave Notes you can:",
  "inviteAccepted.feature1": "Create notes and organize ideas with blocks.",
  "inviteAccepted.feature2":
    "Work on projects with stages, priorities, and deadlines.",
  "inviteAccepted.feature3": "Share content and collaborate with your team.",
  "inviteAccepted.feature4":
    "Centralize files, links, and context in one place.",
  "inviteAccepted.subject": "Welcome to {organizationName} - Weave Notes",

  "project.preheader": "You were added to a project.",
  "project.title": "New project shared with you",
  "project.subtitle": "Project collaboration",
  "project.intro":
    "{addedByName} added you as a collaborator on the project below.",
  "project.cta": "Open projects",
  "project.outro": "You can now view and collaborate on the project.",
  "project.footer":
    "You received this email because you were added to a project on Weave Notes.",
  "project.subject": "{firstName}, you were added to project \"{projectName}\"",
  "project.untitled": "Untitled",

  "collab.preheader": "You were added as a note collaborator.",
  "collab.title": "New note collaboration",
  "collab.subtitle": "Note sharing",
  "collab.intro": "{ownerName} added you as a collaborator.",
  "collab.cta": "Open note",
  "collab.permission": "Collaboration permission is active to view and edit.",
  "collab.outro":
    "If you did not expect this invitation from {ownerName}, you can ignore this email.",
  "collab.subject": "New collaboration: {noteName}",

  "backup.preheader": "Your backup is ready to download.",
  "backup.title": "Backup ready to download",
  "backup.subtitle": "Data export",
  "backup.intro1": "Your data backup was processed successfully.",
  "backup.intro2": "Use the button below to download the file.",
  "backup.cta": "Download backup",
  "backup.info":
    "This link expires in {hours} hour(s) ({expiresLabel}) and can be used once.",
  "backup.outro":
    "Keep this file secure and download it from a trusted environment.",
  "backup.subject": "Your backup is ready to download",

  "dueReminder.preheader": "Reminder for your note deadline.",
  "dueReminder.title": "Deadline reminder",
  "dueReminder.subtitle": "Note due date",
  "dueReminder.intro":
    "The note \"{noteTitle}\" is due tomorrow ({dueDateLabel}).",
  "dueReminder.cta": "Open note",
  "dueReminder.info": "We recommend reviewing the note today to avoid delays.",
  "dueReminder.subject": "Reminder: due tomorrow - {noteTitle}",
  "dueReminder.untitled": "Note",

  "aiReport.cta": "View full report",
  "aiReport.intro":
    "Weave Engine generated a new report for project {projectTitle}.",
  "aiReport.footer":
    "This report was automatically generated by Weave Notes AI.",
  "aiReport.preheader": "New {reportType} for {projectTitle}",
  "aiReport.sprintSuffix": " (Sprint {sprintNumber})",

  "role.owner": "Owner",
  "role.admin": "Administrator",
  "role.member": "Member",
  "role.viewer": "Viewer",
  "role.guest": "Guest",
  "role.super_admin": "Super administrator",

  "reportType.sprint_kickoff": "Sprint Kickoff",
  "reportType.daily_standup": "Daily Standup",
  "reportType.sprint_review": "Sprint Review",
  "reportType.deadline_alert": "Deadline Alert",
  "reportType.analysis": "Analysis",
  "reportType.default": "AI Report",
};
