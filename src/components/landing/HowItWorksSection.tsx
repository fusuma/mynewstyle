"use client";

import { Camera, Brain, Sparkles } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import {
  pageTransition,
  resultsRevealContainer,
  getReducedMotionTransition,
} from "@/lib/motion";
import type { LucideIcon } from "lucide-react";

interface Step {
  number: number;
  icon: LucideIcon;
  title: string;
  description: string;
}

const steps: Step[] = [
  {
    number: 1,
    icon: Camera,
    title: "Tire uma selfie",
    description:
      "Tire uma foto com a câmera ou escolha da galeria. Rápido e fácil.",
  },
  {
    number: 2,
    icon: Brain,
    title: "A IA analisa o seu rosto",
    description:
      "Nossa inteligência artificial identifica o formato do seu rosto e características únicas.",
  },
  {
    number: 3,
    icon: Sparkles,
    title: "Receba o seu estilo ideal",
    description:
      "Receba recomendações personalizadas de cortes e estilos que harmonizam com o seu rosto.",
  },
];

export function HowItWorksSection() {
  const prefersReducedMotion = useReducedMotion();
  const reduceMotion = !!prefersReducedMotion;

  const containerVariants = {
    hidden: { opacity: reduceMotion ? 1 : 0 },
    visible: {
      opacity: 1,
      transition: {
        ...getReducedMotionTransition(reduceMotion, pageTransition),
        staggerChildren: reduceMotion ? 0 : resultsRevealContainer.staggerChildren,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: reduceMotion ? 1 : 0, y: reduceMotion ? 0 : 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: getReducedMotionTransition(reduceMotion, pageTransition),
    },
  };

  return (
    <section
      id="how-it-works"
      data-testid="how-it-works-section"
      aria-labelledby="how-it-works-heading"
      className="scroll-mt-16 bg-muted/50 py-16 md:py-24"
    >
      <div className="mx-auto max-w-[1200px] px-4 md:px-6">
        <motion.h2
          id="how-it-works-heading"
          className="font-display text-center text-[24px] font-semibold text-foreground md:text-[32px]"
          initial={{ opacity: reduceMotion ? 1 : 0, y: reduceMotion ? 0 : 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={getReducedMotionTransition(reduceMotion, pageTransition)}
        >
          Como funciona
        </motion.h2>

        <motion.ol
          className="mt-10 grid list-none grid-cols-1 gap-6 md:mt-14 md:grid-cols-3 md:gap-8"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
        >
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <motion.li
                key={step.number}
                variants={itemVariants}
                className="flex flex-col items-center rounded-card bg-card p-6 text-center shadow-card md:p-8"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">
                  {step.number}
                </span>

                <Icon
                  className="mt-4 h-8 w-8 text-accent"
                  aria-hidden="true"
                  strokeWidth={1.5}
                />

                <h3 className="font-body mt-4 text-lg font-semibold text-foreground">
                  {step.title}
                </h3>

                <p className="font-body mt-2 text-base text-muted-foreground">
                  {step.description}
                </p>
              </motion.li>
            );
          })}
        </motion.ol>
      </div>
    </section>
  );
}
