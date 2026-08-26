import { motion, type Variants } from "motion/react"

import { getVariants, type IconProps, IconWrapper, useAnimateIconContext } from "./icon.tsx"

type GlobeProps = IconProps<keyof typeof animations>

const animations = {
  default: {
    circle: {},
    latitudes: {},
    meridian: {
      initial: { scaleX: 1, transition: { duration: 0.5, ease: "easeInOut" } },
      animate: {
        scaleX: [1, 0.08, 1],
        transition: { duration: 1.1, ease: "easeInOut" },
      },
    },
  } satisfies Record<string, Variants>,
  spin: {
    circle: {},
    latitudes: {},
    meridian: {
      initial: { scaleX: 1, transition: { duration: 0.5, ease: "easeInOut" } },
      animate: {
        scaleX: [1, 0.08, 1, 0.08, 1],
        transition: { duration: 2.2, ease: "easeInOut" },
      },
    },
  } satisfies Record<string, Variants>,
} as const

function IconComponent({ size, ...props }: GlobeProps) {
  const { controls } = useAnimateIconContext()
  const variants = getVariants(animations)

  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <motion.circle
        cx={12}
        cy={12}
        r={10}
        variants={variants.circle}
        initial="initial"
        animate={controls}
      />
      <motion.path
        d="M2 12h20"
        variants={variants.latitudes}
        initial="initial"
        animate={controls}
      />
      <motion.path
        d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"
        style={{ transformOrigin: "12px 12px" }}
        variants={variants.meridian}
        initial="initial"
        animate={controls}
      />
    </motion.svg>
  )
}

function Globe(props: GlobeProps) {
  return <IconWrapper icon={IconComponent} {...props} />
}

export { animations, Globe, Globe as GlobeIcon, type GlobeProps, type GlobeProps as GlobeIconProps }
