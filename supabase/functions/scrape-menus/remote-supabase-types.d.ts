// Local TypeScript shim so editors/tsserver can understand Deno-style remote imports.
// At runtime, this module is loaded from the URL by Deno/Supabase; here we just
// re-export the npm package's types for tooling purposes.

declare module "https://esm.sh/@supabase/supabase-js@2.45.3" {
  export * from "@supabase/supabase-js";
}


