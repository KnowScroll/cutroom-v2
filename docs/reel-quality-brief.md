# Reel Generation Quality — Root-Cause Investigation, Repair Strategy and Handoff

> The user's brief of 2026-11-27, kept verbatim. Sections 1-16 are the requirements for the repair phase. Section 17 applied only to the investigation session, which produced [HANDOFF.md](../HANDOFF.md) and [reel-quality-findings.md](reel-quality-findings.md). Reel paths are under `C:\Users\XZNON\cutroom-v2\var\reels-to-watch\` (gitignored).

The current quality of our generated reels is not good enough. There are fundamental problems with storytelling, templates, visual planning, animation, object representation, composition, timing, factual accuracy and the synchronization between narration and visuals.

We need to fix the underlying generation capabilities rather than manually fixing individual videos.

Our objective is to generate reels that are coherent, engaging, visually meaningful, accurate, simple to understand and appropriately animated across different subjects.

## 1. Review the existing generated reels

Watch the following reels in their entirety, including their audio, narration, captions, animations, transitions, visual composition and timing.

Do not review them solely through isolated screenshots, successful rendering logs or automated checks.

The issues listed below are initial observations, not an exhaustive list. Independently identify additional problems.

### A. Globe Zoom Explainer — Venus

Locate the existing Venus globe zoom explainer in the generated reels directory.

The reel discusses Venus but depicts Earth.

Problems include:

- Incorrect planetary representation.
- Missing planets and other relevant celestial objects.
- Missing or insufficient animations.
- Visuals that do not represent what is being narrated.
- Possible Earth-specific assumptions within a supposedly reusable template.

The globe zoom template must be capable of adapting to different planets, geographical subjects and other appropriate topics.

Do not simply replace Earth with Venus. Investigate why the engine selected or generated the wrong representation in the first place.

### B. Kurzgesagt — How Long Would It Take to Walk to the Moon?

`C:\Users\XZNON\cutroom-v2\var\reels-to-watch\03-kurzgesagt-how-long-would-it-take-to-walk-to-the-mo.mp4`

Observed problems:

- The walking character does not meaningfully demonstrate the journey.
- Earth and the Moon are superimposed around 11–16 seconds.
- Important animations either do not happen or appear for a very short period.
- Distances, walking speeds, durations and numerical comparisons are not consistently represented visually.
- Measurement labels frequently appear near the end of their corresponding narration.
- Objects and measurements lack clear spatial relationships.
- Around 36–41 seconds, the character, calculator, Moon and multiple labels create a cluttered composition.
- The script concludes that the journey takes approximately 8.6 years but also suggests that it cannot be completed within one lifetime.
- The calculation and its assumptions, including the treatment of the Moon's orbit, require verification.

The video should communicate the journey, distance, walking speed and resulting duration through a connected visual explanation.

The viewer should not have to rely entirely on the narration to understand the concept.

### C. Kurzgesagt — How Big Is the Sun?

`C:\Users\XZNON\cutroom-v2\var\reels-to-watch\05-kurzgesagt-how-big-is-the-sun.mp4`

Observed problems:

- Around 8–11 seconds, labels and measurements appear while their corresponding objects are barely visible or absent.
- Planets appear late, disappear or are not represented appropriately.
- Around 12–21 seconds, the Sun becomes excessively cropped without establishing a useful scale comparison.
- Earth and Sun labels overlap in later scenes.
- The reel states that approximately 109 Earths fit across the Sun, but does not clearly demonstrate that relationship.
- Floating objects, glowing shapes and labels replace meaningful visual demonstrations.
- The camera and object movements do not effectively communicate the scale difference.
- Measurements appear without sufficiently clear connections to the objects being measured.

The entire premise of this reel is a size comparison, yet the visual presentation fails to communicate that comparison.

A successful scale comparison should allow the viewer to intuitively understand the relationship between the objects.

This does not mean hardcoding 109 Earths or any specific animation. The engine should be able to generate an appropriate visual demonstration based on the subject and comparison being explained.

### D. Countryball Map Story — How Did Norway Break Away From Sweden?

`C:\Users\XZNON\cutroom-v2\var\reels-to-watch\06-countryball-map-story-how-did-norway-break-away-from-sweden-in.mp4`

Observed problems:

- Countryballs overlap and obscure one another.
- Characters sometimes appear duplicated or occupy inappropriate positions.
- Documents, signs, labels, speech bubbles and characters compete for the same screen space.
- Props obscure characters unnecessarily.
- Much of the reel repeats nearly identical compositions despite explaining different events.
- The map is frequently used as a decorative background instead of contributing to the explanation.
- The story jumps between historical events without adequately explaining their relationships.
- Dates, historical figures, political events and chronology require factual verification.

The engine should use character interactions, expressions, poses, props, maps and animation to communicate the actual story.

For example, a negotiation, disagreement, union, separation or transfer of authority should be visually distinguishable where appropriate.

Simply placing two countryballs next to each other while the narration describes an event is not sufficient.

Do not build dedicated Norway–Sweden behavior into the template. Improve the underlying capabilities so that other countries, historical events, political stories and suitable scenarios can be depicted.

### E. Script Sketch Template — Remove

`C:\Users\XZNON\cutroom-v2\var\reels-to-watch\07-script-sketch-make-a-funny-30-second-ad-for-our-new-se.mp4`

Remove this template from the supported template lineup.

Inspect its dependencies and integration points before removing or disabling it.

Do not remove shared functionality that is used by other templates.

### F. Globe Zoom Explainer — Why Is Point Nemo the Loneliest Place on Earth?

`C:\Users\XZNON\cutroom-v2\var\reels-to-watch\09-globe-zoom-explainer-why-is-point-nemo-the-loneliest-place-on.mp4`

Observed problems:

- Land and ocean colors visibly invert around 1, 20 and 41 seconds.
- Visual appearance is inconsistent across globe and map representations.
- The transition from the globe to the map does not establish a sufficiently clear geographical context.
- The narration discusses three landmasses, but their geographical relationships are not clearly demonstrated together.
- Distance measurements are duplicated or persist after their original context is gone.
- Map markers and labels do not always have clear relationships to the geographical features they represent.
- Camera movements and animations frequently happen without a meaningful explanatory purpose.
- The storytelling needs to be more connected and understandable.

A globe or map-based explanation should preserve geographic and visual consistency throughout the video.

Locations, distances, boundaries, markers, routes and camera movements should collectively communicate the concept.

Do not move the camera, rotate the globe or animate a marker simply because the template expects movement.

Every significant movement should have a reason.

### G. Kurzgesagt — How Small Is an Atom Compared to a Grain of Sand?

`C:\Users\XZNON\cutroom-v2\var\reels-to-watch\10-kurzgesagt-how-small-is-an-atom-compared-to-a-grain.mp4`

This reel is comparatively good and should be used as a positive visual and structural reference.

It has a more identifiable explanatory progression:

- Establishing the subject.
- Introducing measurements.
- Comparing the objects.
- Providing a final analogy.

Preserve the capabilities that are working here.

However, the template still requires improvements:

- The opening remains visually empty for approximately two seconds.
- Object labels occasionally overlap.
- The microscope appears briefly without effectively demonstrating its significance.
- The grain of sand changes its appearance during the final comparison.
- The final analogy is not adequately represented visually.
- Object visibility, placement, transitions and animation timing can be improved.

There is also a significant factual error.

The script states that one millimeter contains one million picometers and concludes that an atom is 10,000 times smaller than the grain of sand.

One millimeter actually contains one billion picometers. Given the stated dimensions of one millimeter and 100 picometers, the ratio is approximately 10 million.

The stated final analogy is therefore also incorrect.

Investigate how incorrect calculations entered the script and propagated into the visuals without being identified or repaired.

This reel should serve as both a positive regression reference and an example of why visual quality alone is insufficient.

Do not unnecessarily redesign or regress the parts that already work.

## 2. Investigate the underlying root causes

Do not assume that all of these problems originate in the templates.

Investigate the relevant end-to-end pipeline, including:

- Brief interpretation.
- Script and story generation.
- Factual reasoning and calculations.
- Storyboarding and visual planning.
- Template selection and template capabilities.
- Asset and object generation.
- Scene composition.
- Object identity and persistence.
- Animation scheduling and execution.
- Narration synchronization.
- Camera movement.
- Measurements, labels and text.
- Rendering and compositing.
- Review, validation and repair.

Determine where each observed failure originates.

For example, a missing planet could result from incorrect script interpretation, incomplete visual planning, missing asset generation, unsupported template behavior, incorrect animation scheduling, visibility settings or a rendering failure.

Do not fix the symptom without understanding the cause.

Find recurring failure patterns across the different reels. Where multiple templates exhibit the same problem, investigate whether a shared upstream capability is responsible.

Fix shared problems at their appropriate source instead of creating repeated template-specific workarounds.

## 3. Script and storytelling — highest priority

The script and story generation system is one of the most important capabilities of the engine, and its current quality is insufficient.

The scripts frequently sound like disconnected factual statements rather than a coherent story or explanation.

The engine should understand what it is trying to communicate before deciding how to communicate it.

Improve script generation so that:

- The story has a clear purpose and central idea.
- The beginning provides appropriate context and establishes why the subject is interesting.
- Concepts are introduced in a logical order.
- Each idea naturally leads to the next.
- Necessary explanations are not skipped.
- Cause-and-effect relationships are understandable.
- Technical subjects are explained simply without becoming inaccurate.
- Comparisons and analogies genuinely help the viewer understand.
- The story has a satisfying and meaningful conclusion.
- The tone and narrative structure adapt to the subject and intended reel style.

Not every video needs the same narrative structure. A historical story, scientific explanation, comedy reel and product demonstration may require completely different approaches.

Do not force them into a universal storytelling formula.

Do not choke the creative process beforehand with arbitrary word counts, fixed sentence lengths, mandatory numbers of scenes, cuts or rigid pacing requirements.

The story should determine the necessary scenes, pacing and visual requirements.

Respect explicitly requested durations, but prioritize coherence and viewer comprehension when developing the script. Adjust the content intelligently rather than mechanically shortening sentences or scenes.

A script should be understandable, connected and worth listening to even without visuals.

Read generated scripts independently before evaluating the resulting videos.

## 4. Factual, mathematical and logical correctness

Educational and explanatory reels must communicate accurate information.

The engine should appropriately verify:

- Mathematical calculations.
- Unit conversions.
- Ratios and scale comparisons.
- Distances and measurements.
- Dates and historical chronology.
- Geographical relationships.
- Scientific claims.
- Conclusions and analogies derived from earlier information.

Ensure that information remains consistent across the script, narration, captions, labels and animations.

If the script says one value, the visual representation should not show another.

If the script introduces a mathematical assumption, the resulting calculation and conclusion must agree with it.

Avoid unsupported precision. Clearly distinguish approximate measurements, simplified representations and actual values where necessary.

Use reliable sources or deterministic calculations wherever appropriate.

This does not require creating an elaborate fact-checking architecture. First investigate how the existing generation and review systems can handle factual consistency effectively.

## 5. Visual storytelling and semantic understanding

The visuals should actively communicate the story instead of merely decorating the narration.

The engine must understand the relationship between what is being said and what should be shown.

For important narrative concepts, identify appropriate visual demonstrations.

Examples:

- If a distance is being explained, establish the relevant objects and communicate their separation through a meaningful representation.
- If a size comparison is being explained, demonstrate the relative scale instead of just displaying two unrelated objects.
- If a historical event involves a disagreement, negotiation or separation, depict the relevant interaction where appropriate.
- If a geographical location is being explained, establish its surrounding geography and relevant spatial relationships.
- If a mathematical calculation is important to the story, display its relevant values or relationships in an understandable manner.
- If an object is introduced, ensure that it is recognizable and relevant to the subject.

These are examples of desired capabilities, not hardcoded rules or predefined solutions.

Do not interpret this requirement as needing to animate every word or display every number mentioned in the narration.

The engine should exercise creative judgment and determine which information needs visual support.

Some moments may require a diagram, some an animation, some a static comparison, and others a simple composition.

The goal is comprehension, not constant movement or visual density.

## 6. Animation must communicate something

Animations should not be generated merely because an animation is expected.

Movement, scaling, rotation, camera changes, transitions, character actions and visual effects should serve an identifiable narrative or explanatory purpose.

There is a difference between moving an object and demonstrating a concept through animation.

The latter is what we need.

Animations should:

- Have meaningful starting and ending states.
- Communicate changes, actions and relationships clearly.
- Begin when relevant to the narration.
- Progress at an understandable speed.
- Remain visible long enough for the viewer to comprehend them.
- Preserve continuity between related visual states.
- Avoid abrupt resets and unexplained changes.

For example, when comparing two objects of vastly different sizes, simply enlarging one until it exceeds the screen is not necessarily a useful demonstration.

The engine should determine whether a zoom, repeated reference objects, a scale indicator, an analogy, a staged comparison or another representation would communicate the concept more effectively.

Do not hardcode any one of these methods as the universal solution.

Simple animations that communicate a concept clearly are preferable to complex animations that communicate nothing.

## 7. Temporal continuity and narration synchronization

The current videos frequently show important objects, labels and animations too late or for too little time.

Investigate how visual events are timed relative to narration and scene progression.

Important visual elements should have understandable lifecycles:

- Introduction.
- Establishment.
- Action or explanation.
- Sufficient viewing time.
- Transition or removal when no longer needed.

These are conceptual expectations, not mandatory implementation stages for every object.

Ensure that:

- Objects appear when they become relevant.
- Labels and measurements appear alongside the information they explain.
- Important animations are not compressed into the final fraction of a scene.
- Objects remain visible for as long as they are needed.
- Related objects do not disappear unexpectedly between scenes.
- Stale labels and measurements do not remain after their context has changed.
- Animations are not clipped by scene endings.
- Transitions preserve important visual relationships.

Investigate the actual generated narration timing rather than relying solely on estimated speech durations.

Do not solve this with arbitrary universal delays, minimum animation durations or hardcoded scene lengths.

Timing should adapt to the actual content, animation and narration.

## 8. Spatial composition and object relationships

The engine must improve its ability to compose scenes containing multiple objects.

Objects should not simply be assigned positions independently without considering the resulting composition.

Ensure appropriate consideration of:

- Object dimensions and visual bounds.
- Relative positions.
- Text and label placement.
- Character interactions.
- Props and foreground elements.
- Camera framing.
- Captions and screen-safe regions.
- Visual hierarchy.
- Intentional versus unintentional overlap.
- Visibility and occlusion.
- Available screen space.

A label must be clearly associated with the object it describes.

A measurement should have an understandable relationship to the objects being measured.

Characters should not obscure one another unless the overlap is intentional.

A camera zoom should not accidentally crop out the most important part of a visual explanation.

Do not introduce rigid layout rules that prevent legitimate creative compositions.

Intentional overlap, cropping, exaggerated scale and visual layering can be useful when employed correctly.

The engine needs to distinguish meaningful visual decisions from accidental visual failures.

## 9. Object identity and visual consistency

Objects must maintain consistent identity and appearance throughout the video unless a change is intentional.

Investigate why:

- Earth appears in a video about Venus.
- Continents and oceans exchange colors.
- Grain-of-sand representations change unexpectedly.
- Countryball characters appear duplicated.
- Labels become detached from their intended subjects.
- Objects unexpectedly appear, disappear or reset.

An object introduced earlier in the story should remain recognizable when it reappears.

Different camera views, scales, poses and visual representations should preserve the relevant distinguishing characteristics.

Use appropriate simplified or stylized representations, but do not allow them to become misleading or unrecognizable.

The objective is visual consistency, not photorealism.

## 10. Template generalizability — non-negotiable

The existing reels are evidence of problems, not the complete set of use cases.

Do not optimize the templates specifically for Venus, the Moon, the Sun, Norway, Sweden, Point Nemo or atoms.

Each template should be reusable across different subjects within its intended scope.

For example:

- The globe zoom template should support different appropriate planetary and geographical subjects.
- The scale comparison template should support astronomical, microscopic, biological, architectural and other appropriate comparisons.
- The countryball template should support different countries, historical events, interactions and political stories.

The engine should determine how to use the available capabilities based on the brief and story.

Do not hardcode topic-specific scripts, assets, coordinates, timings, object placements or animation sequences merely to make these examples pass.

Also investigate whether the templates themselves are too restrictive.

A template should provide useful creative capabilities, visual conventions and reusable behavior without forcing every story into the same sequence of scenes and actions.

Where existing capabilities are insufficient, improve or extend them using the simplest appropriate solution.

Do not create a separate template for every possible visual situation.

## 11. Preserve simplicity and existing engineering principles

Our priorities remain:

**Lightweight, fast, simple, reliable and creatively capable.**

- Avoid overengineering.
- Do not add unnecessary systems, abstraction layers or dependencies.
- Prefer improving existing capabilities over introducing new architectures.
- Remove unnecessary complexity where appropriate.
- Preserve existing functionality that works well.
- Maintain the existing programmable visual-generation approach.
- Do not introduce image-generation or video-generation models.
- Keep code comments minimal and meaningful.
- Lint checks, type checks and relevant tests are mandatory.
- Do not use silent fallbacks or superficial patches to conceal failures.
- Preserve performance and reasonable generation latency.

The requirements in this document describe expected behavior and quality. They do not imply that each requirement needs a new subsystem.

Do not introduce unnecessary schemas, validators, agents, prompts, configuration files or orchestration layers simply because they appear to address a problem.

Investigate first, simplify wherever possible, and implement only what is necessary.

## 12. Review and repair — do not blindly accept outputs

A successfully rendered video is not necessarily a successful video.

A video can pass all technical checks while being visually broken, factually incorrect or impossible to understand.

The review process must examine the actual generated outputs.

Evaluate the script, narration, visual sequence and their relationships.

The reviewer should identify issues such as:

- Incorrect or missing visual representations.
- Narration describing actions that never occur.
- Animations that are too short to understand.
- Incorrect measurements or comparisons.
- Objects overlapping unintentionally.
- Inconsistent visual identity.
- Unexplained visual changes.
- Unnecessary camera movement.
- Disconnected storytelling.
- Cluttered compositions.
- Important information that is never communicated visually.

Review videos across their timelines, not just through isolated screenshots.

Use relevant intermediate artifacts, logs, timestamps, generated plans and rendering information to diagnose problems.

When a review identifies a failure, trace it back to its underlying cause and repair the appropriate system.

Do not simply reject the output and regenerate it repeatedly without investigating the reason for failure.

Do not introduce overly restrictive creative gates.

Distinguish between objective technical or factual failures and subjective creative preferences.

The review process should help the engine improve and repair its output, not unnecessarily restrict its creative freedom.

## 13. Testing and regression strategy

For every affected template:

1. Review the original generated reels in full.
2. Document observed issues with timestamps and supporting evidence.
3. Investigate and establish root causes.
4. Implement appropriate generalizable fixes.
5. Run relevant automated checks and tests.
6. Regenerate the original problematic reels.
7. Review the regenerated videos with their complete audio and visual sequences.
8. Generate additional reels using substantially different, previously untested topics.
9. Review the new reels to verify generalizability.
10. Identify and repair remaining problems.
11. Verify that previously working capabilities have not regressed.

Use the atom comparison reel as a positive visual regression reference, while also correcting its factual and remaining visual issues.

Include test cases that exercise different object counts, scales, narrative structures, compositions, interactions and animation requirements.

Do not repeatedly optimize against the same handful of examples.

Testing should cover the generation process, not merely the final rendered files.

Where practical, inspect intermediate artifacts to determine whether a failure originates during script generation, visual planning, template execution, animation or rendering.

Automated checks should supplement, not replace, audiovisual review.

## 14. Definition of done

A template should not be considered repaired merely because:

- Its code compiles.
- Tests pass.
- The video renders.
- Objects appear on screen.
- An animation exists.
- A previous failure no longer occurs in one specific example.
- A subagent reports successful completion.

The generated outputs should demonstrate that:

- The script tells a coherent and understandable story.
- The information is factually and logically consistent.
- Important narrated concepts are appropriately visualized.
- The correct objects and subjects are represented.
- Animations communicate meaningful actions or relationships.
- Visual timing aligns with the narration.
- Important visuals remain visible long enough to understand.
- Labels and measurements are readable and correctly associated.
- Objects maintain visual consistency.
- Compositions avoid unintended overlap and clipping.
- Camera movements have meaningful purposes.
- The underlying fixes generalize to different appropriate topics.
- Previously working capabilities remain functional.

Ultimately, evaluate the reels from the perspective of an ordinary viewer who has never encountered the subject before.

Can the viewer understand what is being explained, follow the story, understand the visuals and remember the main takeaway?

If not, investigate why.

Do not claim completion without supporting evidence. Clearly document any remaining limitations or unresolved issues.

## 15. Multi-agent implementation strategy

The implementation will take place in a new session.

The main session agent must act as the orchestrator, technical decision-maker, integration owner and final reviewer.

Use subagents for appropriately scoped responsibilities, such as:

- Repository and pipeline investigation.
- Script and storytelling improvements.
- Factual and mathematical consistency.
- Template-specific investigations and repairs.
- Shared visual, composition and animation capabilities.
- Testing and regression analysis.
- Independent audiovisual reviews.

These are suggested workstreams, not mandatory permanent agents.

The orchestrator should determine the appropriate division of work after examining the architecture and dependencies.

Parallelize independent work wherever practical.

Avoid assigning multiple subagents to independently modify the same shared functionality.

The main agent must:

- Maintain awareness of the complete system.
- Establish the implementation plan and task dependencies.
- Assign clear responsibilities and expected outcomes.
- Review subagent findings.
- Challenge unsupported assumptions.
- Review implementations.
- Resolve conflicts and integration problems.
- Inspect the regenerated outputs.
- Assign further repairs where necessary.
- Make the final completion decision based on evidence.

Use Opus for planning, architectural assessment and critical reviews where available.

Do not blindly accept a subagent's implementation or review.

Use GitHub issues for actionable tasks and checkpoints in accordance with existing repository practices. Keep tracking lightweight and practical.

## 16. Determine where the repairs should happen

Before beginning implementation, investigate both Cutroom v2 and FastReel.

Determine:

- Where the affected templates originate.
- Which repository owns the relevant generation capabilities.
- Whether Cutroom v2 reuses, ports, modifies or extends FastReel functionality.
- Whether the problems already exist in FastReel.
- Whether the problems were introduced during integration into Cutroom v2.
- Which repository should own each relevant fix.
- How improvements should propagate between repositories.

If FastReel owns the affected functionality, consider whether fixing it upstream is the appropriate approach.

If Cutroom v2 has substantially diverged or introduced its own problems, determine whether the relevant repairs belong directly in Cutroom v2.

Do not make this decision based on assumptions. Inspect the actual implementations and integration relationships.

Avoid maintaining duplicate fixes or independently repairing equivalent functionality in multiple places.

Recommend the correct repository or a clearly defined division of responsibility between both repositories.

Explain the recommendation with supporting evidence.

## 17. Current session — investigation and handoff only

(Applied to the investigation session of 2026-11-27 only: no implementation; review the videos, inspect both repositories, find root causes, decide where repairs happen, write the handoff. Done: see HANDOFF.md.)

## Final objective

We are not trying to fix seven individual reels.

We are trying to make the underlying reel generation engine capable of producing genuinely good videos across different topics.

The engine should understand what it wants to communicate, construct a coherent story, determine how best to represent that story visually, generate the necessary objects and animations, compose them correctly, synchronize them with narration and review the resulting output.

Templates should enable creativity and provide reusable capabilities, not constrain every video into the same collection of floating objects, generic movements and disconnected facts.

Do not take shortcuts, hardcode the provided examples or accept visibly broken outputs.

Take the necessary time to investigate and repair the actual problems while keeping the system lightweight, fast and simple.
