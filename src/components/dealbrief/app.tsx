"use client";

/**
 * DealBrief: the whole flow on one page (design: issue #12).
 *
 *   A Criteria -> B Targets -> C Outreach -> "Two weeks later"
 *   -> 1 Deal setup -> 2 Quality check -> 3 Walk-away price -> 4 CFO memo
 *
 * The server keeps no state, so everything a later step needs lives here and
 * is sent back with each request.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import buyer from "@/data/buyer.json";
import criteriaSample from "@/data/criteria-sample.json";
import type { ParsedCriteria } from "@/lib/criteria";
import { formatM1 } from "@/lib/finance/format";
import type {
  AcquisitionCriteria,
  DealMemo,
  DealReview,
  ExtractionResult,
  OutreachDraft,
  SourcingResult,
} from "@/types/deal";
import { AppHeader, Page, type Role, type StepItem, Stepper } from "./chrome";
import { postJson } from "./client";
import { StepCriteria } from "./step-criteria";
import { StepLater } from "./step-later";
import { type MemoStatus, StepMemo } from "./step-memo";
import { StepOutreach } from "./step-outreach";
import { StepQuality } from "./step-quality";
import { StepSetup } from "./step-setup";
import { StepTargets } from "./step-targets";
import { StepWalkAway } from "./step-walkaway";

type Step =
  | "criteria"
  | "targets"
  | "outreach"
  | "later"
  | "setup"
  | "quality"
  | "walkaway"
  | "memo";

const PIPELINE: Step[] = ["criteria", "targets", "outreach"];
const { ceo, analyst } = criteriaSample;

const initialsOf = (name: string) =>
  name
    .split(/[\s.]+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const ROLE_BY_STEP: Record<Step, Role> = {
  criteria: "analyst",
  targets: "ceo",
  outreach: "ceo",
  later: "ceo",
  setup: "analyst",
  quality: "analyst",
  walkaway: "analyst",
  memo: "cfo",
};

export function DealBriefApp() {
  const [step, setStep] = useState<Step>("criteria");
  const [busy, setBusy] = useState<string | null>(null);

  const [notes, setNotes] = useState(criteriaSample.notes);
  const [parsing, setParsing] = useState(true);
  const [parsed, setParsed] = useState<ParsedCriteria | null>(null);
  const [criteria, setCriteria] = useState<AcquisitionCriteria | null>(null);
  const [answers, setAnswers] = useState<string[]>(["", "", ""]);

  const [sourcing, setSourcing] = useState<SourcingResult | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [drafts, setDrafts] = useState<OutreachDraft[]>([]);

  const [extraction, setExtraction] = useState<ExtractionResult | null>(null);
  const [review, setReview] = useState<DealReview | null>(null);
  const [coachOn, setCoachOn] = useState(true);
  const [memo, setMemo] = useState<DealMemo | null>(null);
  const [memoStatus, setMemoStatus] = useState<MemoStatus>("awaiting");

  const go = (next: Step) => {
    setStep(next);
    window.scrollTo({ top: 0 });
  };

  /** Runs a request with a busy marker and a toast on failure. */
  const run = async <T,>(
    key: string,
    task: () => Promise<T>,
  ): Promise<T | undefined> => {
    setBusy(key);
    try {
      return await task();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Something went wrong",
      );
      return undefined;
    } finally {
      setBusy(null);
    }
  };

  // --- A: criteria ---------------------------------------------------------

  const parse = useCallback(async (text: string) => {
    setParsing(true);
    try {
      const result = await postJson<ParsedCriteria>("/api/criteria", {
        action: "parse",
        notes: text,
      });
      setParsed(result);
      setCriteria(result.criteria);
      setAnswers(result.forgottenQuestions.map(() => ""));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not read the notes",
      );
    } finally {
      setParsing(false);
    }
  }, []);

  const parsedOnce = useRef(false);
  useEffect(() => {
    if (parsedOnce.current) return;
    parsedOnce.current = true;
    void parse(criteriaSample.notes);
  }, [parse]);

  const sendToCeo = () =>
    run("send", async () => {
      if (!criteria || !parsed) return;
      const ceoAnswers = parsed.forgottenQuestions
        .map((question, index) => ({
          question,
          answer: (answers[index] ?? "").trim(),
        }))
        .filter((entry) => entry.answer.length > 0);
      const result = await postJson<{ criteria: AcquisitionCriteria }>(
        "/api/criteria",
        { action: "send_to_ceo", criteria, ceoAnswers },
      );
      setCriteria(result.criteria);
    });

  const approveCriteria = () =>
    run("approve", async () => {
      if (!criteria) return;
      const result = await postJson<{ criteria: AcquisitionCriteria }>(
        "/api/criteria",
        { action: "approve", criteria },
      );
      setCriteria(result.criteria);
      toast.success(`${ceo.name} approved the criteria`);
    });

  // --- B: targets ----------------------------------------------------------

  const findTargets = () =>
    run("sourcing", async () => {
      if (sourcing) return go("targets");
      const result = await postJson<SourcingResult>("/api/sourcing", {
        criteria,
      });
      setSourcing(result);
      setSelected(
        result.candidates
          .filter(
            (candidate) => candidate.analystRecommendation === "recommend",
          )
          .map((candidate) => candidate.id),
      );
      go("targets");
    });

  const toggleSelected = (id: string) => {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
    // A changed selection makes any earlier drafts stale.
    setDrafts([]);
  };

  // --- C: outreach ---------------------------------------------------------

  const draftEmails = () =>
    run("draft", async () => {
      if (!sourcing) return;
      if (drafts.length > 0) return go("outreach");
      const candidates = sourcing.candidates.filter((candidate) =>
        selected.includes(candidate.id),
      );
      const result = await postJson<{ drafts: OutreachDraft[] }>(
        "/api/outreach/draft",
        { candidates, criteria, ceo },
      );
      setDrafts(result.drafts);
      go("outreach");
    });

  const patchDraft = (candidateId: string, patch: Partial<OutreachDraft>) =>
    setDrafts((current) =>
      current.map((draft) =>
        draft.candidateId === candidateId ? { ...draft, ...patch } : draft,
      ),
    );

  const sendDraft = (candidateId: string) =>
    run(`send:${candidateId}`, async () => {
      const draft = drafts.find((item) => item.candidateId === candidateId);
      if (!draft) return;
      // Approval is per email: the CEO pressing the button is the approval.
      const result = await postJson<{ draft: OutreachDraft }>(
        "/api/outreach/send",
        { draft: { ...draft, status: "approved" } },
      );
      patchDraft(candidateId, result.draft);
    });

  // --- 1-4: deal review ----------------------------------------------------

  const startDeal = () =>
    run("extract", async () => {
      if (!extraction) {
        const result = await postJson<{ extraction: ExtractionResult }>(
          "/api/deal/extract",
        );
        setExtraction(result.extraction);
      }
      go("setup");
    });

  const confirmField = (key: string, confirmed: boolean) =>
    setExtraction((current) =>
      current
        ? {
            ...current,
            fields: current.fields.map((field) =>
              field.key === key ? { ...field, confirmed } : field,
            ),
          }
        : current,
    );

  const confirmAll = () =>
    setExtraction((current) =>
      current
        ? {
            ...current,
            fields: current.fields.map((field) => ({
              ...field,
              confirmed: true,
            })),
          }
        : current,
    );

  const fetchReview = (realization: number) =>
    postJson<{ review: DealReview }>("/api/deal/review", {
      extraction,
      criteria: criteria ?? undefined,
      realization,
    });

  const runReview = () =>
    run("review", async () => {
      const result = await fetchReview(0.5);
      setReview(result.review);
      setMemo(null);
      setMemoStatus("awaiting");
      go("quality");
    });

  const changeRealization = (realization: number) =>
    run("realization", async () => {
      const result = await fetchReview(realization);
      setReview(result.review);
      setMemo(null);
      setMemoStatus("awaiting");
    });

  const writeMemo = () =>
    run("memo", async () => {
      if (!review) return;
      if (!memo) {
        const result = await postJson<{ memo: DealMemo }>("/api/deal/memo", {
          review,
          criteria: criteria ?? undefined,
        });
        setMemo(result.memo);
      }
      go("memo");
    });

  // --- chrome --------------------------------------------------------------

  const role = ROLE_BY_STEP[step];
  const person = role === "analyst" ? analyst.name : ceo.name;
  const inPipeline = PIPELINE.includes(step);
  const target = extraction?.target;
  const hartwell = sourcing?.candidates.find((candidate) =>
    drafts.some(
      (draft) => draft.candidateId === candidate.id && draft.status === "sent",
    ),
  );
  const unanswered = sourcing?.candidates.find(
    (candidate) =>
      candidate.id !== hartwell?.id &&
      drafts.some(
        (draft) =>
          draft.candidateId === candidate.id && draft.status === "sent",
      ),
  );

  if (step === "later") {
    return (
      <StepLater
        ceoFirstName={ceo.name.split(" ")[0]}
        sentCount={drafts.filter((draft) => draft.status === "sent").length}
        founderName={hartwell?.contact?.name ?? "The founder"}
        targetShortName={(hartwell?.name ?? "the target").split(" ")[0]}
        otherCompany={unanswered?.name.split(" ")[0]}
        askingPrice={formatM1(16.5)}
        onStart={startDeal}
        busy={busy === "extract"}
      />
    );
  }

  const groups: { label: string; items: StepItem<Step>[] }[] = [
    {
      label: "Sourcing",
      items: [
        {
          id: "criteria",
          label: "Criteria",
          done: criteria?.status === "approved",
        },
        {
          id: "targets",
          label: "Shortlist",
          done: drafts.length > 0,
          disabled: !sourcing,
        },
        {
          id: "outreach",
          label: "Outreach",
          done: drafts.some((draft) => draft.status === "sent"),
          disabled: drafts.length === 0,
        },
      ],
    },
    {
      label: "Deal review",
      items: [
        {
          id: "setup",
          label: "Setup",
          done: Boolean(review),
          disabled: !extraction,
        },
        {
          id: "quality",
          label: "Earnings",
          done: Boolean(review) && step !== "setup" && step !== "quality",
          disabled: !review,
        },
        {
          id: "walkaway",
          label: "Price",
          done: Boolean(memo),
          disabled: !review,
        },
        { id: "memo", label: "Memo", disabled: !memo },
      ],
    },
  ];

  return (
    <div className="bg-db-bg text-db-ink min-h-screen">
      <AppHeader
        section={inPipeline ? "Pipeline" : "Deals"}
        title={
          inPipeline
            ? step === "criteria"
              ? "New acquisition search"
              : "Aerospace CNC search"
            : (target?.name ?? "Deal review")
        }
        role={role}
        initials={initialsOf(person)}
      />
      <Stepper groups={groups} active={step} onSelect={go} />
      <Page>
        {step === "criteria" && (
          <StepCriteria
            notes={notes}
            onNotes={setNotes}
            parsed={parsed}
            criteria={criteria}
            parsing={parsing}
            answers={answers}
            onAnswer={(index, value) =>
              setAnswers((current) =>
                current.map((answer, i) => (i === index ? value : answer)),
              )
            }
            onUseSampleAnswers={() =>
              setAnswers(parsed?.sampleAnswers ?? answers)
            }
            onParse={() => void parse(notes)}
            onSend={sendToCeo}
            onApprove={approveCriteria}
            onFindTargets={findTargets}
            busy={busy}
            ceoName={ceo.name}
            buyerFile={buyer.sourceFile}
          />
        )}

        {step === "targets" && sourcing && (
          <StepTargets
            sourcing={sourcing}
            selected={selected}
            onToggle={toggleSelected}
            onDraft={draftEmails}
            busy={busy}
            analystName={analyst.name}
          />
        )}

        {step === "outreach" && sourcing && (
          <StepOutreach
            drafts={drafts}
            candidates={sourcing.candidates}
            onEdit={patchDraft}
            onSend={sendDraft}
            onSkip={(id) => patchDraft(id, { status: "skipped" })}
            onContinue={() => go("later")}
            busy={busy}
          />
        )}

        {step === "setup" && (
          <StepSetup
            extraction={extraction}
            criteria={criteria}
            buyerFile={buyer.sourceFile}
            onConfirm={confirmField}
            onConfirmAll={confirmAll}
            onRun={runReview}
            busy={busy}
          />
        )}

        {step === "quality" && review && (
          <StepQuality
            review={review}
            coachOn={coachOn}
            onToggleCoach={() => setCoachOn((value) => !value)}
            onNext={() => go("walkaway")}
          />
        )}

        {step === "walkaway" && review && (
          <StepWalkAway
            review={review}
            onRealization={changeRealization}
            onMemo={writeMemo}
            busy={busy}
          />
        )}

        {step === "memo" && review && memo && (
          <StepMemo
            memo={memo}
            review={review}
            status={memoStatus}
            onStatus={setMemoStatus}
            analyst={analyst}
            dateLabel={new Date()
              .toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
              .toUpperCase()}
          />
        )}
      </Page>
    </div>
  );
}
