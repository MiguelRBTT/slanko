export function EditIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M18 6 6 18M6 6l12 12"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ClockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 7v5l3 2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Ícone A/Z com seta — ordenação alfabética. */
export function SortAlphaIcon({ reverse = false }: { reverse?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {reverse ? (
        <>
          <text
            x="2.5"
            y="10"
            fill="currentColor"
            fontSize="8"
            fontWeight="700"
            fontFamily="system-ui, sans-serif"
          >
            Z
          </text>
          <text
            x="2.5"
            y="19.5"
            fill="currentColor"
            fontSize="8"
            fontWeight="700"
            fontFamily="system-ui, sans-serif"
          >
            A
          </text>
          <path
            d="M18 20V5M18 5l-3 3M18 5l3 3"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      ) : (
        <>
          <text
            x="2.5"
            y="10"
            fill="currentColor"
            fontSize="8"
            fontWeight="700"
            fontFamily="system-ui, sans-serif"
          >
            A
          </text>
          <text
            x="2.5"
            y="19.5"
            fill="currentColor"
            fontSize="8"
            fontWeight="700"
            fontFamily="system-ui, sans-serif"
          >
            Z
          </text>
          <path
            d="M18 4v15M18 19l-3-3M18 19l3-3"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )}
    </svg>
  );
}

/** Ícone com seta e linhas — ordenação de lista/valores. */
export function SortListIcon({ reverse = false }: { reverse?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {reverse ? (
        <path
          d="M5 19V5M5 5l-2.4 2.4M5 5l2.4 2.4M11 6.5h10M11 11h10M11 15.5h10M11 20h10"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <path
          d="M5 5v14M5 19l-2.4-2.4M5 19l2.4-2.4M11 6.5h10M11 11h10M11 15.5h10M11 20h10"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}
