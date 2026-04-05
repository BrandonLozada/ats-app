export function canMoveApplication(user: any, application: any) {
  // ADMIN puede todo
  if (user.role === "ADMIN") return true;

  // Reclutador solo sus vacantes
  if (user.role === "RECRUITER") {
    return application.jobPosting.createdById === user.id;
  }

  // Médico solo puede participar en entrevistas
  if (user.role === "DOCTOR") {
    return application.stage?.type === "INTERVIEW";
  }

  return false;
}
