export interface RequestScope {
  accessToken: string
}

export interface TeamRequestScope extends RequestScope {
  teamId: string
}
