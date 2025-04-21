export type RewriteRule = {
  // Path to rewrite
  path: string

  // Optional pathname preprocessor function
  // Executes before the path is rewritten
  pathPreprocessor?: (path: string) => string
}

export type DomainConfig = {
  domain: string
  rules: RewriteRule[]
}

export type RewriteConfig = {
  config: DomainConfig | null
  rule: RewriteRule | null
}
