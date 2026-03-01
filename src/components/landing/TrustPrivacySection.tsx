"use client";

import { Shield, Users } from "lucide-react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  pageTransition,
  getReducedMotionTransition,
} from "@/lib/motion";

/** Static placeholder count — extract to prop or API call for dynamic use later */
const SOCIAL_PROOF_COUNT = "500+";

export function TrustPrivacySection() {
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

  return (
    <section
      id="trust"
      data-testid="trust-privacy-section"
      aria-labelledby="trust-heading"
      className="scroll-mt-16 bg-background py-12 md:py-16"
    >
      <div className="mx-auto max-w-[1200px] px-4 md:px-6">
        <motion.div
          className="flex flex-col items-center text-center"
          variants={fadeInVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
        >
          {/* Privacy messaging */}
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/10">
              <Shield
                className="h-6 w-6 text-accent"
                aria-hidden="true"
                strokeWidth={1.5}
              />
            </div>

            <h2
              id="trust-heading"
              className="font-body max-w-lg text-lg font-semibold text-foreground md:text-xl"
            >
              A sua foto é processada com segurança e nunca é partilhada
            </h2>

            <p className="font-body max-w-md text-base text-muted-foreground">
              Utilizamos encriptação de ponta e eliminamos fotos após 90 dias
            </p>

            <Link
              href="/privacidade"
              className="font-body text-sm font-medium text-accent underline-offset-4 transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
            >
              Leia a nossa política de privacidade
            </Link>
          </div>

          {/* Social proof */}
          <div className="mt-8 flex items-center gap-2 text-muted-foreground">
            <Users
              className="h-5 w-5 text-accent"
              aria-hidden="true"
              strokeWidth={1.5}
            />
            <p className="font-body text-base">
              Já ajudámos{" "}
              <span className="font-semibold text-accent">
                {SOCIAL_PROOF_COUNT}
              </span>{" "}
              pessoas a encontrar o seu estilo
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
