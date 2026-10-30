import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

type SearchBarProps = {
  id: string;
  defaultValue?: string;
  /** Filters to carry over when searching from an already-filtered page. */
  hiddenParams?: Record<string, string | string[] | undefined>;
  action?: string;
  className?: string;
  size?: "md" | "lg";
  placeholder?: string;
};

/** Plain GET form: works without JavaScript and produces shareable URLs (/library?q=…). */
export function SearchBar({ id, defaultValue, hiddenParams = {}, action = "/library", className, size = "md", placeholder = "Search notes, topics, tags…" }: SearchBarProps) {
  return (
    <form role="search" action={action} method="get" className={cn("relative flex w-full", className)}>
      <label htmlFor={id} className="sr-only">
        Search resources
      </label>
      {Object.entries(hiddenParams).flatMap(([name, value]) =>
        (Array.isArray(value) ? value : value ? [value] : []).map((v) => <input key={`${name}-${v}`} type="hidden" name={name} value={v} />),
      )}
      <input
        id={id}
        name="q"
        type="search"
        defaultValue={defaultValue}
        placeholder={placeholder}
        maxLength={200}
        autoComplete="off"
        enterKeyHint="search"
        className={cn("input rounded-r-none border-r-0", size === "lg" ? "min-h-12 text-base" : "min-h-10")}
      />
      <button type="submit" className={cn("btn rounded-l-none bg-teal-700 text-white hover:bg-teal-800", size === "lg" && "min-h-12 px-5")}>
        <Search className="h-4 w-4" aria-hidden="true" />
        <span className={cn(size === "md" && "sr-only")}>Search</span>
      </button>
    </form>
  );
}
