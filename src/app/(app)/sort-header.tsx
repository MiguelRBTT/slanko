import { SortAlphaIcon, SortListIcon } from "./action-icons";
import styles from "./page-shared.module.css";

export type SortDir = "asc" | "desc";

type SortHeaderProps = {
  label: string;
  active: boolean;
  sortDir: SortDir;
  defaultDir: SortDir;
  hintAsc: string;
  hintDesc: string;
  alpha?: boolean;
  onToggle: () => void;
};

export function SortHeader({
  label,
  active,
  sortDir,
  defaultDir,
  hintAsc,
  hintDesc,
  alpha = false,
  onToggle,
}: SortHeaderProps) {
  const nextDir = active && sortDir === "asc" ? "desc" : active ? "asc" : defaultDir;
  const hint = nextDir === "asc" ? hintAsc : hintDesc;
  const reverse = active ? sortDir === "desc" : false;
  const Icon = alpha ? SortAlphaIcon : SortListIcon;

  return (
    <button
      type="button"
      className={styles.sortHeader}
      onClick={onToggle}
      title={hint}
      aria-label={`${label}. ${hint}`}
    >
      <span>{label}</span>
      <span className={styles.sortIcon}>
        <Icon reverse={reverse} />
      </span>
    </button>
  );
}

export function nextSortState<K extends string>(
  currentKey: K,
  currentDir: SortDir,
  nextKey: K,
  defaultDir: SortDir,
): { key: K; dir: SortDir } {
  if (currentKey === nextKey) {
    return { key: currentKey, dir: currentDir === "asc" ? "desc" : "asc" };
  }

  return { key: nextKey, dir: defaultDir };
}
