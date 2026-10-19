import { useId, useLayoutEffect, useRef, useState } from "react";
import { ChevronDown, List } from "lucide-react";
import { Button, C, Card, SERIF } from "../../theme.jsx";
import LessonLocator from "./LessonLocator.jsx";

function Disclosure({ id, label, open, onToggle, children }) {
  return (
    <div className="lesson-disclosure">
      <Button type="button" tone="quiet" aria-expanded={open} aria-controls={id} onClick={onToggle}>
        {label}
        <ChevronDown size={16} aria-hidden="true" className={open ? "lesson-chevron lesson-chevron-open" : "lesson-chevron"} />
      </Button>
      {open && <div id={id} className="lesson-disclosure-body">{children}</div>}
    </div>
  );
}

function Passage({ block, source, translationOpen, onToggleTranslation, translationId }) {
  if (block.type === "paragraph") return <p>{block.text}</p>;
  if (block.type === "translation") {
    return (
      <Disclosure id={translationId} label="Traducción al inglés" open={translationOpen} onToggle={onToggleTranslation}>
        <p className="lesson-label" lang="en">{block.label}</p>
        <p lang="en">{block.text}</p>
      </Disclosure>
    );
  }
  return (
    <div className={`lesson-source-passage lesson-source-passage--${block.type}`}>
      <p className="lesson-label">{block.label}</p>
      {block.type === "excerpt" ? <blockquote>{block.text}</blockquote> : <p>{block.text}</p>}
      {block.note && <p className="lesson-note">{block.note}</p>}
      {source && <p className="lesson-credit">{source.credit}</p>}
    </div>
  );
}

// Only transient reading state. The notebook supplies no services to this player.
export default function LessonPlayer({ lesson }) {
  const instance = useId();
  const [navigation, setNavigation] = useState({ id: lesson.coreOrder[0], sequence: 0, returnBranchId: null });
  const [visits, setVisits] = useState({});
  const [outlineOpen, setOutlineOpen] = useState(false);
  const [finished, setFinished] = useState(false);
  const heading = useRef(null);
  const branchControls = useRef({});
  const scrollPositions = useRef({});
  const step = lesson.steps.find((candidate) => candidate.id === navigation.id);
  const visit = visits[step.id] || {};
  const coreIndex = lesson.coreOrder.indexOf(step.kind === "branch" ? step.returnTo : step.id);
  const sources = lesson.sources.filter((source) => step.sourceIds.includes(source.id));
  const glosses = lesson.glossary.filter((gloss) => step.glossaryIds.includes(gloss.id));
  const selected = step.activity?.options.find((option) => option.id === visit.choice);
  const panelId = (name) => `${instance}-${step.id}-${name}`;

  function changeVisit(patch) {
    setVisits((current) => ({ ...current, [step.id]: { ...current[step.id], ...patch } }));
  }
  function go(id, returnBranchId = null) {
    scrollPositions.current[step.id] = window.scrollY;
    setOutlineOpen(false);
    setFinished(false);
    setNavigation((current) => ({ id, sequence: current.sequence + 1, returnBranchId }));
  }

  useLayoutEffect(() => {
    if (navigation.sequence === 0) return;
    const returnControl = branchControls.current[navigation.returnBranchId];
    (returnControl || heading.current)?.focus({ preventScroll: true });
    if (returnControl) {
      window.scrollTo({ top: scrollPositions.current[navigation.id] || 0, behavior: "instant" });
    } else {
      heading.current?.scrollIntoView?.({ block: "start", behavior: "instant" });
    }
  }, [navigation]);

  return (
    <main className="lesson-reader" lang="es" style={{ color: C.ink, fontFamily: SERIF }}>
      <header className="lesson-header">
        <div className="lesson-toolbar">
          <p className="lesson-brand">Mi cuaderno · Lecciones</p>
          <div className="lesson-position">
            <span aria-hidden="true">{coreIndex + 1} de {lesson.coreOrder.length}</span>
            <progress aria-label="Posición de lectura" aria-valuetext={`Página ${coreIndex + 1} de ${lesson.coreOrder.length}`}
              value={coreIndex + 1} max={lesson.coreOrder.length} />
          </div>
          <Button type="button" tone="quiet" aria-label="Índice del capítulo" aria-expanded={outlineOpen}
            aria-controls={`${instance}-outline`} onClick={() => setOutlineOpen(!outlineOpen)}>
            <List size={17} aria-hidden="true" /> Índice
          </Button>
        </div>
        {outlineOpen && <nav id={`${instance}-outline`} aria-label="Páginas del capítulo">
          <ol className="lesson-outline">
            {lesson.coreOrder.map((id, index) => (
              <li key={id}>
                <button type="button" aria-current={id === lesson.coreOrder[coreIndex] ? "step" : undefined} onClick={() => go(id)}>
                  {index + 1}. {lesson.steps.find((candidate) => candidate.id === id).title}
                </button>
              </li>
            ))}
          </ol>
        </nav>}
        <h1>{lesson.title}</h1>
        <p className="lesson-question">{lesson.question}</p>
      </header>
      <article key={step.id} aria-labelledby={`${instance}-step-title`}>
        {step.kind === "branch" && <p className="lesson-eyebrow">Exploración opcional</p>}
        <h2 ref={heading} tabIndex={-1} id={`${instance}-step-title`}>{step.title}</h2>
        {step.timeLabel && <p className="lesson-time-label">{step.timeLabel}</p>}
        {step.card?.variant === "mexico-1917-locator" && <LessonLocator card={step.card} />}
        <div className="lesson-prose">
          {step.blocks.map((block) => (
            <Passage key={block.id} block={block} source={lesson.sources.find((source) => source.id === block.sourceId)}
              translationId={panelId(block.id)} translationOpen={!!visit.translations?.[block.id]}
              onToggleTranslation={() => changeVisit({ translations: { ...visit.translations, [block.id]: !visit.translations?.[block.id] } })} />
          ))}
        </div>
        {step.card && !step.card.variant && (
          <Card className="lesson-orientation">
            <h3 id={`${instance}-${step.card.id}`}>{step.card.title}</h3>
            <ul>{step.card.lines.map((line) => <li key={line}>{line}</li>)}</ul>
            {step.card.note && <p className="lesson-note">{step.card.note}</p>}
          </Card>
        )}
        <Disclosure id={panelId("english")} label={<span lang="en">English help</span>} open={!!visit.english} onToggle={() => changeVisit({ english: !visit.english })}>
          <p className="lesson-label" lang="en">Meaning summary · not a line-by-line translation</p>
          <p lang="en">{step.english}</p>
          {step.followUpEnglish && <p lang="en">{step.followUpEnglish}</p>}
        </Disclosure>
        {glosses.length > 0 && (
          <Disclosure id={panelId("glossary")} label="Palabras de esta página" open={!!visit.glossary} onToggle={() => changeVisit({ glossary: !visit.glossary })}>
            <dl className="lesson-glossary">
              {glosses.map((gloss) => <div key={gloss.id}><dt>{gloss.term}</dt><dd lang="en">{gloss.meaning}</dd></div>)}
            </dl>
          </Disclosure>
        )}
        {step.branchIds?.map((id) => {
          const branch = lesson.steps.find((candidate) => candidate.id === id);
          return <Button key={id} ref={(node) => { branchControls.current[id] = node; }} type="button" className="lesson-branch-button" onClick={() => go(id)}>{branch.launchLabel} · opcional</Button>;
        })}
        {step.activity && (
          <Card className="lesson-activity">
            <h3>{step.activity.prompt}</h3>
            <p className="lesson-note">Puedes elegir, mirar las explicaciones o continuar sin responder.</p>
            <div className="lesson-choices">
              {step.activity.options.map((option) => (
                <Button key={option.id} type="button" tone="quiet" aria-pressed={visit.choice === option.id} onClick={() => changeVisit({ choice: option.id })}>{option.text}</Button>
              ))}
            </div>
            <p role="status" className="lesson-feedback">{selected?.feedback || ""}</p>
            <Disclosure id={panelId("explanations")} label="Ver explicaciones" open={!!visit.explanations} onToggle={() => changeVisit({ explanations: !visit.explanations })}>
              <ul className="lesson-explanations">
                {step.activity.options.map((option) => <li key={option.id}><p><strong>{option.text}</strong></p><p>{option.feedback}</p></li>)}
              </ul>
            </Disclosure>
            {step.followUp && <p>{step.followUp}</p>}
          </Card>
        )}
        {step.reflection && (
          <Card className="lesson-reflection">
            <h3>{step.reflection.title} · opcional</h3>
            <p>{step.reflection.prompt}</p>
            <p className="lesson-note">Esta vista previa no guarda texto. Puedes responder en voz alta o en papel.</p>
            <ul>{step.reflection.frames.map((frame) => <li key={frame}>{frame}</li>)}</ul>
            <p>{step.reflection.selfCheck}</p>
            <Disclosure id={panelId("model")} label="Ver un modelo" open={!!visit.model} onToggle={() => changeVisit({ model: !visit.model })}>
              <p className="lesson-label">Ejemplo elaborado para esta lección · no es una respuesta oficial</p>
              <p>{step.reflection.model}</p>
            </Disclosure>
          </Card>
        )}
        <Disclosure id={panelId("sources")} label="Fuentes y notas" open={!!visit.sources} onToggle={() => changeVisit({ sources: !visit.sources })}>
          <p className="lesson-note">Narración y ayudas elaboradas para esta lección; las citas históricas se identifican por separado. Los enlaces abren otra pestaña y necesitan conexión.</p>
          {step.sourceNote && <p>{step.sourceNote}</p>}
          {sources.map((source) => (
            <section key={source.id} className="lesson-source-note">
              <h3>{source.title}</h3><p>{source.credit}</p><p>{source.limit}</p>
              <ul>{source.links.map((link) => <li key={link.url}><a href={link.url} target="_blank" rel="noreferrer">{link.label}</a></li>)}</ul>
            </section>
          ))}
        </Disclosure>
        {step.nextChapter && <aside className="lesson-next-chapter"><p className="lesson-label">Vista del próximo capítulo · todavía no disponible</p><p>{step.nextChapter}</p></aside>}
        {step.id === lesson.endId && <p role="status" className="lesson-feedback">{finished ? "Fin del capítulo. Puedes volver a cualquier página con el índice." : ""}</p>}
      </article>
      <p className="lesson-preview-note">
        Vista previa: la posición y las respuestas a las opciones se reinician al recargar.
        Usa Anterior, Siguiente e Índice para recorrer el capítulo. Atrás del navegador sale de esta vista.
      </p>
      <nav className="lesson-controls" aria-label="Recorrer el capítulo">
        {step.kind === "branch" ? (
          <Button type="button" onClick={() => go(step.returnTo, step.id)}>Volver a la lectura</Button>
        ) : (
          <>
            <Button type="button" tone="quiet" disabled={coreIndex === 0} onClick={() => go(lesson.coreOrder[coreIndex - 1])}>Anterior</Button>
            {step.id === lesson.endId
              ? <Button type="button" aria-disabled={finished} tone={finished ? "quiet" : "primary"} onClick={() => { if (!finished) setFinished(true); }}>{finished ? "Capítulo terminado" : "Terminar sin escribir"}</Button>
              : <Button type="button" onClick={() => go(lesson.coreOrder[coreIndex + 1])}>Siguiente</Button>}
          </>
        )}
      </nav>
    </main>
  );
}
