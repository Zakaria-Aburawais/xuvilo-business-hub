interface AnimatedLogoProps {
  showWordmark?: boolean;
  className?: string;
}

export function AnimatedLogo({ showWordmark = true, className = "" }: AnimatedLogoProps) {
  if (showWordmark) {
    return (
      <span className={`xuvilo-logo inline-flex items-center ${className}`}>
        <img
          src="/xuvilo-logo.png"
          alt="Xuvilo Business Hub"
          width={479}
          height={136}
          loading="eager"
          decoding="async"
          className="xuvilo-logo__full xuvilo-logo__full--light h-9 sm:h-10 md:h-11 w-auto shrink-0 object-contain block dark:hidden"
        />
        <img
          src="/xuvilo-logo-dark.png"
          alt="Xuvilo Business Hub"
          width={479}
          height={136}
          loading="eager"
          decoding="async"
          className="xuvilo-logo__full xuvilo-logo__full--dark h-9 sm:h-10 md:h-11 w-auto shrink-0 object-contain hidden dark:block"
        />
      </span>
    );
  }

  return (
    <span className={`xuvilo-logo inline-flex items-center ${className}`}>
      <img
        src="/xuvilo-logo-mark.png"
        alt="Xuvilo"
        width={134}
        height={136}
        loading="eager"
        decoding="async"
        className="xuvilo-logo__icon w-9 h-9 sm:w-10 sm:h-10 shrink-0 object-contain"
      />
    </span>
  );
}
