import React from 'react';
import ContentPanel from '../shell/ContentPanel.jsx';

function PlanTable({rows}) {
  const [columns, ...entries] = rows;
  return (
    <table className="plan-paper-table">
      <thead><tr>{columns.map(label => <th key={label} scope="col">{label}</th>)}</tr></thead>
      <tbody>
        {entries.map(([heading, ...cells]) => (
          <tr key={heading}>
            <th scope="row">{heading}</th>
            {cells.map((cell, index) => <td key={columns[index]}>{cell}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function PlanSection({section}) {
  return (
    <section>
      <h3>{section.title}</h3>
      {section.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
    </section>
  );
}

function PlanActivity({activity, number, language}) {
  return (
    <li className="plan-activity">
      <span className="plan-activity-number" aria-hidden="true">{String(number).padStart(2, '0')}</span>
      <div>
        <h4>{activity.title}</h4>
        <small>{activity.phase}</small>
        <div className="plan-activity-meta">{activity.time}</div>
        <details className="plan-paper-activity-details">
          <summary lang={language}>{language === 'en'
            ? 'Objectives, content, deliverables and procedure'
            : 'Mục tiêu, nội dung, sản phẩm và tổ chức thực hiện'}</summary>
          {activity.parts.map(part => (
            <section key={part.title}>
              <h5>{part.title}</h5>
              <p>{part.paragraphs[0]}</p>
            </section>
          ))}
          <section>
            <h5>{activity.procedure.title}</h5>
            <ol>
              {activity.procedure.paragraphs.map(paragraph => {
                const [step, ...description] = paragraph.replace(/^\d\. /u, '').split('  ');
                return <li key={step}><b>{step}</b> {description.join('  ')}</li>;
              })}
            </ol>
          </section>
        </details>
      </div>
    </li>
  );
}

export default function AseanPaperPlan({plan, language}) {
  const periodLabel = language === 'en' ? 'Period' : 'Tiết';
  const minutesLabel = language === 'en' ? 'minutes' : 'phút';
  return (
    <div className="plan-paper-body" lang={language}>
      <ContentPanel className="plan-section" ariaLabel={plan.objectives.title}>
        <h2>{plan.objectives.title}</h2>
        {plan.objectives.sections.map(section => <PlanSection key={section.title} section={section} />)}
      </ContentPanel>

      <ContentPanel className="plan-section" ariaLabel={plan.materials.title}>
        <h2>{plan.materials.title}</h2>
        {plan.materials.sections.map(section => <PlanSection key={section.title} section={section} />)}
        <h3>{plan.materials.tableTitle}</h3>
        <PlanTable rows={plan.materials.rows} />
        <p>{plan.materials.fallback}</p>
      </ContentPanel>

      <ContentPanel className="plan-section plan-sequence" ariaLabel={plan.sequence.title}>
        <h2>{plan.sequence.title}</h2>
        <p>{plan.sequence.description}</p>
        <PlanTable rows={plan.sequence.rows} />
        <h3>{plan.assessment.title}</h3>
        <PlanTable rows={plan.assessment.rows} />
        <p>{plan.assessment.note}</p>
        <details className="plan-paper-rubric">
          <summary lang={language}>{language === 'en'
            ? 'Group exhibition rubric · 10 points · Appendix F'
            : 'Rubric triển lãm nhóm · 10 điểm · Phụ lục F'}</summary>
          <div lang="en">
            <PlanTable rows={plan.assessment.rubric} />
            <p>{plan.assessment.scales}</p>
          </div>
        </details>
        <div className="plan-periods">
          {[1, 2].map(period => {
            const activities = plan.activities.filter(activity => activity.period === period);
            const minutes = activities.reduce((sum, activity) => sum + activity.minutes, 0);
            const firstActivity = plan.activities.indexOf(activities[0]) + 1;
            return (
              <section className="plan-period" key={period} aria-label={`${periodLabel} ${period}`}>
                <h3>{periodLabel} {period} · {minutes} {minutesLabel}</h3>
                <ol className="plan-activities" role="list" start={firstActivity}>
                  {activities.map((activity, index) => <PlanActivity key={activity.title} activity={activity} number={firstActivity + index} language={language} />)}
                </ol>
              </section>
            );
          })}
        </div>
      </ContentPanel>
    </div>
  );
}
