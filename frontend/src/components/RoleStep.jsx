export default function RoleStep({ onSelect }) {
  const options = [
    { id: "student", label: "I'm a student", desc: "Explain topics, get gap reports." },
    { id: "parent", label: "I'm a parent", desc: "View a linked child's reports." },
    { id: "teacher", label: "I'm a teacher", desc: "View linked students' reports." },
  ];
  return (
    <section>
      <h1>Who's using this account?</h1>
      <p className="lede">You can't change this later, so pick carefully.</p>
      <div className="persona-list">
        {options.map((o) => (
          <button key={o.id} className="persona-row" onClick={() => onSelect(o.id)}>
            <span className="role-mark">{o.id.charAt(0).toUpperCase()}</span>
            <span className="persona-copy">
              <p className="persona-name">{o.label}</p>
              <p className="persona-desc">{o.desc}</p>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}