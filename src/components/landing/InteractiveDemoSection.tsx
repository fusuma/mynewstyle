"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  pageTransition,
  getReducedMotionTransition,
} from "@/lib/motion";
import { BeforeAfterSlider } from "@/components/landing/BeforeAfterSlider";

export function InteractiveDemoSection() {
  const prefersReducedMotion = useReducedMotion();
  const reduceMotion = !!prefersReducedMotion;

  const fadeInVariants = {
    hidden: { opacity: reduceMotion ? 1 : 0, y: reduceMotion ? 0 : 16 },
    visible: {
      opacity: 1,
      y: 0,
      transition: getReducedMotionTransition(reduceMotion, pageTransition),
    },
  };

  const staggerContainer = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: reduceMotion ? 0 : 0.15,
      },
    },
  };

  return (
    <section
      id="interactive-demo"
      data-testid="interactive-demo-section"
      aria-labelledby="interactive-demo-heading"
      className="scroll-mt-16 bg-muted/50 py-16 md:py-24"
    >
      <motion.div
        className="mx-auto max-w-[1200px] px-4 md:px-6"
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-50px" }}
      >
        {/* Heading */}
        <motion.div
          className="mb-8 flex flex-col items-center text-center"
          variants={fadeInVariants}
        >
          <h2
            id="interactive-demo-heading"
            className="font-display text-2xl font-bold text-foreground md:text-3xl"
          >
            Veja o resultado
          </h2>
          <p className="font-body mt-3 max-w-md text-base text-muted-foreground">
            Veja como funciona — sem precisar de foto
          </p>
        </motion.div>

        {/* Slider container */}
        <motion.div
          className="mx-auto max-w-[600px]"
          variants={fadeInVariants}
        >
          <BeforeAfterSlider
            beforeSrc="/demo/before.jpg"
            afterSrc="/demo/after.jpg"
            beforeAlt="Rosto com estilo original"
            afterAlt="Rosto com novo corte de cabelo recomendado"
            width={800}
            height={1000}
          />
        </motion.div>
      </motion.div>
    </section>
  );
}
