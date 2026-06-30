// [SEC 100] Imports & risk utilities
// SEC 100  Imports & risk utilities   getRiskColor · getRiskLevelClass · getRiskLevelText
// SEC 200  Reusable sub-components    Section · DetailItem
// SEC 300  Component init             props · data filtering · signature processing
// SEC 400  Style definitions          tableHeaderStyle · cellStyle · riskCell · signature styles · page calc
// SEC 500  Document header            logo · title
// SEC 600  Table of contents          dynamic TOC with section/page references
// SEC 700  Sections 1–3              Project Details · Project Team · Method Statement
// SEC 800  Section 4                  Risk Assessments (initial + residual tables per category)
// SEC 900  Sections 5–6              Safety & Logistics · Equipment (PPE/Tools/Materials)
// SEC 1000 Section 7                  Risk Summary & Analysis
// SEC 1100 Section 8 & print CSS     Approval & Sign-Off · @media print styles
import React from 'react';
import riskEvaluationMatrix from '../assets/risk-evaluation-matrix.png';
import uctelLogo from '../assets/uctel-logo.png';

const getRiskColor = (score) => {
    // Risk matrix colors based on 5-level standard risk evaluation matrix
    if (score >= 20) return '#ff0000'; // Red - Very High (20-25)
    if (score >= 15) return '#ff9900'; // Orange - High (15-16)
    if (score >= 8) return '#ffff00';  // Yellow - Medium (8-12)
    if (score >= 3) return '#90EE90';  // Light Green - Low (3-6)
    if (score >= 1) return '#00ff00';  // Bright Green - Very Low (1-2)
    return 'transparent';
};

const getRiskLevelClass = (score) => {
    if (score >= 20) return 'risk-level-very-high';
    if (score >= 15) return 'risk-level-high';
    if (score >= 8) return 'risk-level-medium';
    if (score >= 3) return 'risk-level-low';
    if (score >= 1) return 'risk-level-very-low';
    return '';
};

const getRiskLevelText = (score) => {
    if (score >= 20) return 'VERY HIGH';
    if (score >= 15) return 'HIGH';
    if (score >= 8) return 'MEDIUM';
    if (score >= 3) return 'LOW';
    if (score >= 1) return 'VERY LOW';
    return 'NONE';
};
// [SEC 100 END]

// [SEC 200] Reusable sub-components
const Section = ({ title, children }) => (
    <div style={{ marginTop: '40px', pageBreakInside: 'avoid' }}>
        <h2 style={{ color: '#2c4f6b', borderBottom: '2px solid #008080', paddingBottom: '5px', marginBottom: '20px' }}>
            {title}
        </h2>
        {children}
    </div>
);

const DetailItem = ({ label, value }) => (
    <div style={{ marginBottom: '15px' }}>
        <div style={{ 
            fontSize: '10px', 
            fontWeight: 'bold', 
            color: '#495057', 
            marginBottom: '6px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
        }}>
            {label}
        </div>
        <div style={{ 
            fontSize: '12px',
            color: '#212529',
            padding: '8px 12px',
            backgroundColor: '#fff',
            border: '1px solid #ced4da',
            borderRadius: '4px',
            lineHeight: '1.4',
            minHeight: '16px'
        }}>
            {value || 'Not specified'}
        </div>
    </div>
);
// [SEC 200 END]

// [SEC 300] Component init
const PrintableDocument = ({ data, allTasks }) => {
    if (!data) {
        return <div>Loading document...</div>;
    }

    const {
        client,
        siteAddress,
        projectDescription,
        commencementDate,
        estimatedCompletionDate,
        hoursOfWork,
        preparedBy,
        preparedByEmail,
        preparedByPhone,
        documentCreationDate,
        revisionNumber,
        projectTeam,
        selectedTasks,
        risks,
        ppe,
        tools,
        materials,
        safetyLogistics,
        signatureBlock
    } = data;

    const enabledTasks = selectedTasks.filter(task => task.enabled);
    const riskEntries = Object.entries(risks || {});
    const selectedRiskEntries = riskEntries.filter(([, category]) =>
        Array.isArray(category?.hazards) && category.hazards.some(hazard => hazard.selected)
    );

    const signatureDetails = signatureBlock || {};
    const signatureName = signatureDetails.name || preparedBy;
    const signatureDate = signatureDetails.date || documentCreationDate;
    const signatureMode = signatureDetails.mode || 'typed';
    const signatureText = signatureDetails.signatureText || signatureName;
    const signatureImageSrc = signatureMode === 'image' ? signatureDetails?.signatureImage?.dataUrl : null;
    const matchingTeamMember = (projectTeam || []).find(member => member.name && member.name === signatureName);
    const signatureRole = matchingTeamMember?.role || (projectTeam && projectTeam[0]?.role) || 'Not specified';
// [SEC 300 END]

// [SEC 400] Style definitions
    const tableHeaderStyle = {
        backgroundColor: '#004a63', // darker blue like screenshot
        color: '#ffffff',
        padding: '8px 6px',
        fontSize: '11px',
        textAlign: 'center',
        border: '1px solid #000',
        verticalAlign: 'middle',
        fontWeight: 'bold'
    };

    // Risk table specific styles (separate from generic tableHeaderStyle if needed later)
    const riskHeaderTextStyle = {
        ...tableHeaderStyle,
        textAlign: 'center',
        fontWeight: 'bold',
        backgroundColor: '#0a4f69', // deeper teal like screenshot
        border: '1px solid #000'
    };

    const cellStyle = {
        padding: '8px 6px',
        fontSize: '11px',
        border: '1px solid #000',
        textAlign: 'left',
        verticalAlign: 'middle',
        backgroundColor: 'white'
    };

    const riskCell = (score) => ({
        ...cellStyle,
        backgroundColor: getRiskColor(score),
        fontWeight: 'bold',
        textAlign: 'center',
        // Only use white text on the deepest red; orange/yellow/green remain black like screenshot
        color: score >= 20 ? 'white' : 'black',
    });

    const signatureNameFieldStyle = {
        borderBottom: '2px solid #333',
        minHeight: '40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: '600',
        fontSize: '12px',
        backgroundColor: '#fff'
    };

    const signatureBoxStyle = {
        border: '2px solid #333',
        borderRadius: '8px',
        minHeight: '90px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        padding: '10px'
    };

    const signatureScriptStyle = {
        fontFamily: '"Allura", "Great Vibes", "Brush Script MT", cursive',
        fontSize: '32px',
        color: '#1f2937'
    };

    const manualHandlingStatement = 'All risks have been assessed in accordance with the Manual Handling Operations Regulations 1992 (as amended) and align with UCtel\'s HSQE policy and site-specific safe systems of work.';

    const safetyItems = Array.isArray(safetyLogistics) ? safetyLogistics : [];
    const sectionThreePage = 2;
    const sectionFivePage = 4 + Math.floor(selectedRiskEntries.length / 2);
    const sectionSixPage = 5 + Math.floor(Object.keys(risks || {}).length / 2);
    const sectionEightPage = 7 + Math.floor(Object.keys(risks || {}).length / 2);
    const equipmentSubsections = [
        { label: '6.1 Personal Protective Equipment (PPE)' },
        { label: '6.2 Tools & Equipment' },
        { label: '6.3 Materials' }
    ];
// [SEC 400 END]

// [SEC 500] Document header
    return (
        <div className="printable-document" style={{ fontFamily: 'Arial, sans-serif', color: '#333', padding: '15px', backgroundColor: 'white', maxWidth: 'none', width: '700px', margin: '0 auto' }}>
            <header style={{ 
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                marginBottom: '40px' 
            }}>
                {/* Force image size with a container */}
                <div style={{ width: '6cm', marginBottom: '8mm' }}>
                    <img 
                        src={uctelLogo} 
                        alt="UCtel Logo" 
                        style={{ 
                            width: '100%', 
                            height: 'auto',
                        }} 
                    />
                </div>
                <h1 style={{ 
                    color: '#2c4f6b', 
                    margin: 0, 
                    fontSize: '32px', 
                    lineHeight: '1.2',
                    fontWeight: 'bold',
                    textAlign: 'center'
                }}>
                    Risk Assessment<br />& Method Statement
                </h1>
            </header>

            {/* Enhanced Table of Contents */}
            {/* [SEC 500 END] */}
            {/* [SEC 600] Table of contents */}
            <Section title="Table of Contents" className="toc-section">
                <div style={{ 
                    padding: '15px', 
                    border: '2px solid #2c4f6b', 
                    borderRadius: '8px',
                    backgroundColor: '#f8f9fa'
                }}>
                    <div style={{ fontSize: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', padding: '4px 0', borderBottom: '1px dotted #ccc' }}>
                            <span style={{ fontWeight: 'bold' }}>1.0 Project Details</span>
                            <span style={{ fontWeight: 'bold' }}>Page 1</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', padding: '4px 0', borderBottom: '1px dotted #ccc' }}>
                            <span style={{ fontWeight: 'bold' }}>2.0 Project Team</span>
                            <span style={{ fontWeight: 'bold' }}>Page 1</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', padding: '4px 0', borderBottom: '1px dotted #ccc' }}>
                            <span style={{ fontWeight: 'bold' }}>3.0 Method Statement (Sequence of Works)</span>
                            <span style={{ fontWeight: 'bold' }}>Page {sectionThreePage}</span>
                        </div>
                        {enabledTasks.map((task, index) => (
                            <div key={task.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', padding: '3px 0 3px 20px', borderBottom: '1px dotted #eee' }}>
                                <span>3.{index + 1} {allTasks?.[task.taskId]?.title || task.taskTitle || 'Task'}</span>
                                <span>Page {sectionThreePage}</span>
                            </div>
                        ))}
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', padding: '4px 0', borderBottom: '1px dotted #ccc' }}>
                            <span style={{ fontWeight: 'bold' }}>4.0 Risk Assessments</span>
                            <span style={{ fontWeight: 'bold' }}>Page 3</span>
                        </div>
                        {selectedRiskEntries.map(([key, riskCategory], index) => (
                            <div key={key} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', padding: '3px 0 3px 20px', borderBottom: '1px dotted #eee' }}>
                                <span>4.{index + 1} {riskCategory.title}</span>
                                <span>Page {3 + Math.floor(index / 2)}</span>
                            </div>
                        ))}
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', padding: '4px 0', borderBottom: '1px dotted #ccc' }}>
                            <span style={{ fontWeight: 'bold' }}>5.0 Safety & Logistics</span>
                            <span style={{ fontWeight: 'bold' }}>Page {sectionFivePage}</span>
                        </div>
                        {safetyItems.map((item, index) => (
                            <div key={item.id || `${item.title}-${index}`} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', padding: '3px 0 3px 20px', borderBottom: '1px dotted #eee' }}>
                                <span>5.{index + 1} {item.title}</span>
                                <span>Page {sectionFivePage}</span>
                            </div>
                        ))}
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', padding: '4px 0', borderBottom: '1px dotted #ccc' }}>
                            <span style={{ fontWeight: 'bold' }}>6.0 Equipment</span>
                            <span style={{ fontWeight: 'bold' }}>Page {sectionSixPage}</span>
                        </div>
                        {equipmentSubsections.map((entry, index) => (
                            <div key={entry.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', padding: '3px 0 3px 20px', borderBottom: '1px dotted #eee' }}>
                                <span>{entry.label}</span>
                                <span>Page {sectionSixPage}</span>
                            </div>
                        ))}
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', padding: '4px 0', borderBottom: '1px dotted #ccc' }}>
                            <span style={{ fontWeight: 'bold' }}>7.0 Risk Summary & Approval</span>
                            <span style={{ fontWeight: 'bold' }}>Page {6 + Math.floor(Object.keys(risks).length/2)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', padding: '4px 0', borderBottom: '1px dotted #ccc' }}>
                            <span style={{ fontWeight: 'bold' }}>8.0 Approval & Sign-Off</span>
                            <span style={{ fontWeight: 'bold' }}>Page {sectionEightPage}</span>
                        </div>
                    </div>
                </div>
            </Section>

            {/* Page Break */}
            <div className="page-break"></div>

            {/* [SEC 600 END] */}
            {/* [SEC 700] Sections 1–3: Project Details · Project Team · Method Statement */}
            <Section title="1.0 Project Details">
                <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: '1fr 1fr', 
                    gap: '25px',
                    marginBottom: '15px'
                }}>
                    {/* Left Column */}
                    <div style={{ 
                        padding: '20px', 
                        backgroundColor: '#f8f9fa', 
                        border: '1px solid #e9ecef', 
                        borderRadius: '8px',
                        borderLeft: '4px solid #2c4f6b'
                    }}>
                        <h4 style={{ color: '#2c4f6b', marginBottom: '15px', fontSize: '14px', fontWeight: 'bold' }}>
                            Client & Location
                        </h4>
                        <div style={{ marginBottom: '15px' }}>
                            <DetailItem label="Client" value={client} />
                        </div>
                        <div style={{ marginBottom: '15px' }}>
                            <DetailItem label="Site Address" value={siteAddress} />
                        </div>
                        <div>
                            <DetailItem label="Project Description" value={projectDescription} />
                        </div>
                    </div>
                    
                    {/* Right Column */}
                    <div style={{ 
                        padding: '20px', 
                        backgroundColor: '#f8f9fa', 
                        border: '1px solid #e9ecef', 
                        borderRadius: '8px',
                        borderLeft: '4px solid #28a745'
                    }}>
                        <h4 style={{ color: '#2c4f6b', marginBottom: '15px', fontSize: '14px', fontWeight: 'bold' }}>
                            Timeline & Documentation
                        </h4>
                        <div style={{ marginBottom: '15px' }}>
                            <DetailItem label="Commencement Date" value={commencementDate} />
                        </div>
                        <div style={{ marginBottom: '15px' }}>
                            <DetailItem label="Estimated Completion Date" value={estimatedCompletionDate} />
                        </div>
                        <div style={{ marginBottom: '15px' }}>
                            <DetailItem 
                                label="Hours of Work" 
                                value={hoursOfWork ? `${hoursOfWork.startTime} - ${hoursOfWork.endTime}` : 'Not specified'} 
                            />
                        </div>
                        <div style={{ marginBottom: '15px' }}>
                            <DetailItem label="Document Creation Date" value={documentCreationDate} />
                        </div>
                        <div>
                            <DetailItem label="Revision Number" value={revisionNumber} />
                        </div>
                    </div>
                </div>
                
                {/* Full Width Prepared By Section */}
                <div style={{ 
                    padding: '20px', 
                    backgroundColor: '#fff3cd', 
                    border: '1px solid #ffc107', 
                    borderRadius: '8px',
                    borderLeft: '4px solid #ffc107'
                }}>
                    <h4 style={{ color: '#2c4f6b', marginBottom: '10px', fontSize: '14px', fontWeight: 'bold' }}>
                        Document Prepared By
                    </h4>
                    <DetailItem label="Contact Information" value={`${preparedBy} | ${preparedByEmail} | ${preparedByPhone}`} />
                </div>
            </Section>

            <Section title="2.0 Project Team">
                <table style={{ 
                    width: '100%', 
                    borderCollapse: 'collapse',
                    border: '2px solid #2c4f6b',
                    backgroundColor: '#ffffff'
                }}>
                    <thead>
                        <tr style={{ backgroundColor: '#2c4f6b' }}>
                            <th style={{
                                ...tableHeaderStyle,
                                backgroundColor: '#2c4f6b',
                                color: 'white',
                                padding: '12px 8px',
                                fontWeight: 'bold',
                                width: '25%'
                            }}>Name</th>
                            <th style={{
                                ...tableHeaderStyle,
                                backgroundColor: '#2c4f6b',
                                color: 'white',
                                padding: '12px 8px',
                                fontWeight: 'bold',
                                width: '20%'
                            }}>Role</th>
                            <th style={{
                                ...tableHeaderStyle,
                                backgroundColor: '#2c4f6b',
                                color: 'white',
                                padding: '12px 8px',
                                fontWeight: 'bold',
                                width: '35%'
                            }}>Competencies</th>
                            <th style={{
                                ...tableHeaderStyle,
                                backgroundColor: '#2c4f6b',
                                color: 'white',
                                padding: '12px 8px',
                                fontWeight: 'bold',
                                width: '20%'
                            }}>Contact</th>
                        </tr>
                    </thead>
                    <tbody>
                        {projectTeam.filter(member => member.name).map((member, index) => (
                            <tr key={member.id} style={{
                                backgroundColor: index % 2 === 0 ? '#f8f9fa' : '#ffffff',
                                borderBottom: '1px solid #dee2e6'
                            }}>
                                <td style={{
                                    ...cellStyle,
                                    padding: '12px 8px',
                                    fontWeight: '600',
                                    color: '#2c4f6b'
                                }}>{member.name}</td>
                                <td style={{
                                    ...cellStyle,
                                    padding: '12px 8px',
                                    fontStyle: 'italic',
                                    color: '#495057'
                                }}>{member.role}</td>
                                <td style={{
                                    ...cellStyle,
                                    padding: '12px 8px',
                                    fontSize: '11px',
                                    lineHeight: '1.4'
                                }}>
                                    {member.competencies ? (
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                            {member.competencies.split(',').map((comp, compIndex) => (
                                                <span key={compIndex} style={{
                                                    backgroundColor: '#e3f2fd',
                                                    color: '#1976d2',
                                                    padding: '2px 6px',
                                                    borderRadius: '12px',
                                                    fontSize: '10px',
                                                    fontWeight: '500',
                                                    border: '1px solid #bbdefb'
                                                }}>
                                                    {comp.trim()}
                                                </span>
                                            ))}
                                        </div>
                                    ) : (
                                        <span style={{ color: '#6c757d', fontStyle: 'italic' }}>No competencies listed</span>
                                    )}
                                </td>
                                <td style={{
                                    ...cellStyle,
                                    padding: '12px 8px',
                                    fontSize: '11px',
                                    fontFamily: 'monospace'
                                }}>
                                    {member.phone ? (
                                        <div style={{
                                            backgroundColor: '#f1f3f4',
                                            padding: '4px 8px',
                                            borderRadius: '4px',
                                            border: '1px solid #dadce0',
                                            textAlign: 'center'
                                        }}>
                                            📞 {member.phone}
                                        </div>
                                    ) : (
                                        <span style={{ color: '#6c757d', fontStyle: 'italic' }}>No contact provided</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                
                {/* Team Summary Footer */}
                <div style={{
                    marginTop: '15px',
                    padding: '10px',
                    backgroundColor: '#f8f9fa',
                    border: '1px solid #dee2e6',
                    borderRadius: '4px',
                    fontSize: '11px',
                    color: '#495057'
                }}>
                    <strong>Team Size:</strong> {projectTeam.filter(member => member.name).length} member(s) | 
                    <strong> Emergency Contact:</strong> For urgent matters, contact the Project Coordinator
                </div>
            </Section>

            {/* Page Break */}
            <div className="page-break"></div>

            <Section title="3.0 Method Statement (Sequence of Works)">
                <div style={{ fontSize: '12px' }}>
                    {enabledTasks.map((task, index) => (
                        <div key={task.id} style={{ marginBottom: '20px' }}>
                            <h4 style={{
                                margin: '0 0 5px 0',
                                color: '#2c4f6b',
                                fontSize: '14px',
                                fontWeight: 'bold'
                            }}>
                                3.{index + 1} {allTasks[task.taskId]?.title || 'Unknown Task'}
                            </h4>
                            <p style={{
                                margin: '0 0 10px 0',
                                lineHeight: '1.5'
                            }}>
                                {task.description}
                            </p>
                            
                            {/* Display uploaded images */}
                            {task.images && task.images.length > 0 && (
                                <div style={{ 
                                    display: 'flex',
                                    justifyContent: 'center',
                                    flexWrap: 'wrap',
                                    gap: '15px',
                                    margin: '15px 0'
                                }}>
                                    {task.images.map((image, imgIndex) => (
                                        <div key={imgIndex} style={{ 
                                            textAlign: 'center',
                                            maxWidth: '200px'
                                        }}>
                                            <img
                                                src={image.dataUrl}
                                                alt={`${allTasks[task.taskId]?.title || 'Task'} - Image ${imgIndex + 1}`}
                                                style={{
                                                    maxWidth: '100%',
                                                    maxHeight: '150px',
                                                    border: '1px solid #ccc',
                                                    borderRadius: '4px',
                                                    objectFit: 'contain',
                                                    display: 'block',
                                                    margin: '0 auto'
                                                }}
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </Section>

            {/* Conditional Page Break - only if there are risks to display */}
            {selectedRiskEntries.length > 0 && enabledTasks.length > 0 && <div className="page-break"></div>}

            {/* [SEC 700 END] */}
            {/* [SEC 800] Section 4: Risk Assessments */}
            <Section title="4.0 Risk Assessments">
                {selectedRiskEntries
                    .map(([key, riskCategory], categoryIndex) => {
                    const isManualHandling = (riskCategory.title || '').toLowerCase() === 'manual handling';
                    return (
                    <div key={key}>
                        {/* Page break before each risk category (except the first) */}
                        {categoryIndex > 0 && <div className="page-break"></div>}
                        
                        <div style={{ pageBreakInside: 'avoid', marginBottom: '40px' }}>
                            {isManualHandling && (
                                <p style={{
                                    margin: '0 0 12px 0',
                                    fontSize: '12px',
                                    backgroundColor: '#fff9e6',
                                    borderLeft: '4px solid #f4b400',
                                    padding: '10px',
                                    lineHeight: '1.4'
                                }}>
                                    {manualHandlingStatement}
                                </p>
                            )}
                            <h4 style={{ margin: '0 0 15px 0', color: '#2c4f6b', fontSize: '14px', fontWeight: 'bold' }}>
                                4.{categoryIndex + 1} {riskCategory.title}
                            </h4>
                        
                        {/* Initial Risk Assessment Table */}
                        <h4 style={{ color: '#004459', marginBottom: '10px', fontSize: '14px' }}>Initial Risk Assessment</h4>
                        <table className="risk-assessment-table initial-risk-table" style={{ 
                            width: '100%', 
                            borderCollapse: 'collapse', 
                            border: '1px solid #000', 
                            tableLayout: 'fixed',
                            marginBottom: '20px'
                        }}>
                            <thead>
                                <tr>
                                    <th style={{...tableHeaderStyle, width: '8%'}}>Risk No.</th>
                                    <th style={{...tableHeaderStyle, width: '25%'}}>Hazard</th>
                                    <th style={{...tableHeaderStyle, width: '25%'}}>Who Can Be Harmed/How?</th>
                                    <th style={{...tableHeaderStyle, width: '10%'}}>Initial<br/>Likelihood</th>
                                    <th style={{...tableHeaderStyle, width: '10%'}}>Initial<br/>Severity</th>
                                    <th style={{...tableHeaderStyle, width: '10%'}}>Initial<br/>Risk Score</th>
                                    <th style={{...tableHeaderStyle, width: '12%'}}>Risk Level</th>
                                </tr>
                            </thead>
                            <tbody>
                                {riskCategory.hazards.filter(h => h.selected).map((hazard, index) => {
                                    const initialRisk = (hazard.initialLikelihood || 0) * (hazard.initialSeverity || 0);
                                    return (
                                        <tr key={`initial-${hazard.id}`}>
                                            <td style={{...cellStyle, textAlign: 'center', fontWeight: 'bold'}}>{index + 1}</td>
                                            <td style={cellStyle}>{hazard.hazard}</td>
                                            <td style={cellStyle}>{hazard.who}</td>
                                            <td style={{...cellStyle, textAlign: 'center'}}>{hazard.initialLikelihood || 0}</td>
                                            <td style={{...cellStyle, textAlign: 'center'}}>{hazard.initialSeverity || 0}</td>
                                            <td className={getRiskLevelClass(initialRisk)} style={{
                                                ...cellStyle, 
                                                textAlign: 'center', 
                                                fontWeight: 'bold',
                                                backgroundColor: getRiskColor(initialRisk),
                                                color: initialRisk >= 15 ? 'white' : 'black'
                                            }}>{initialRisk}</td>
                                            <td className={getRiskLevelClass(initialRisk)} style={{
                                                ...cellStyle, 
                                                textAlign: 'center',
                                                backgroundColor: getRiskColor(initialRisk),
                                                color: initialRisk >= 15 ? 'white' : 'black',
                                                fontWeight: 'bold'
                                            }}>
                                                {getRiskLevelText(initialRisk)}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>

                        {/* Controls and Residual Risk Assessment Table */}
                        <h4 style={{ color: '#004459', marginBottom: '10px', fontSize: '14px' }}>Controls & Residual Risk Assessment</h4>
                        <table className="risk-assessment-table controls-risk-table" style={{ 
                            width: '100%', 
                            borderCollapse: 'collapse', 
                            border: '1px solid #000', 
                            tableLayout: 'fixed'
                        }}>
                            <thead>
                                <tr>
                                    <th style={{...tableHeaderStyle, width: '8%'}}>Risk No.</th>
                                    <th style={{...tableHeaderStyle, width: '50%'}}>Controls in Place</th>
                                    <th style={{...tableHeaderStyle, width: '10%'}}>Residual<br/>Likelihood</th>
                                    <th style={{...tableHeaderStyle, width: '10%'}}>Residual<br/>Severity</th>
                                    <th style={{...tableHeaderStyle, width: '10%'}}>Residual<br/>Risk Score</th>
                                    <th style={{...tableHeaderStyle, width: '12%'}}>Risk Level</th>
                                </tr>
                            </thead>
                            <tbody>
                                {riskCategory.hazards.filter(h => h.selected).map((hazard, index) => {
                                    const residualRisk = (hazard.residualLikelihood || 0) * (hazard.residualSeverity || 0);
                                    return (
                                        <tr key={`residual-${hazard.id}`}>
                                            <td style={{...cellStyle, textAlign: 'center', fontWeight: 'bold'}}>{index + 1}</td>
                                            <td className="controls-cell" style={cellStyle}>{hazard.controls}</td>
                                            <td style={{...cellStyle, textAlign: 'center'}}>{hazard.residualLikelihood || 0}</td>
                                            <td style={{...cellStyle, textAlign: 'center'}}>{hazard.residualSeverity || 0}</td>
                                            <td className={getRiskLevelClass(residualRisk)} style={{
                                                ...cellStyle, 
                                                textAlign: 'center', 
                                                fontWeight: 'bold',
                                                backgroundColor: getRiskColor(residualRisk),
                                                color: residualRisk >= 15 ? 'white' : 'black'
                                            }}>{residualRisk}</td>
                                            <td className={getRiskLevelClass(residualRisk)} style={{
                                                ...cellStyle, 
                                                textAlign: 'center',
                                                backgroundColor: getRiskColor(residualRisk),
                                                color: residualRisk >= 15 ? 'white' : 'black',
                                                fontWeight: 'bold'
                                            }}>
                                                {getRiskLevelText(residualRisk)}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        </div>
                    </div>
                );
                })}
                {/* Force image size with a container */}
                <div style={{ width: '12cm', marginTop: '20px', marginLeft: 'auto', marginRight: 'auto' }}>
                    <img src={riskEvaluationMatrix} alt="Risk Evaluation Matrix" style={{ width: '100%', height: 'auto', display: 'block' }} />
                </div>
            </Section>

            {/* Conditional Page Break - only if there are safety/logistics items */}
            {/* [SEC 800 END] */}
            {/* [SEC 900] Sections 5–6: Safety & Logistics · Equipment */}
            {safetyLogistics.length > 0 && <div className="page-break"></div>}

            <Section title="5.0 Safety & Logistics">
                {safetyLogistics.map((item, index) => (
                    <div key={item.id} style={{ marginBottom: '15px' }}>
                        <h4 style={{ margin: '0 0 5px 0', color: '#2c4f6b', fontSize: '14px', fontWeight: 'bold' }}>
                            5.{index + 1} {item.title}
                        </h4>
                        
                        {/* Display details for permits if provided */}
                        {item.id === 'permits' && data.permitsDetails && (
                            <div style={{ marginBottom: '10px', padding: '8px', backgroundColor: '#f0f8ff', borderLeft: '3px solid #2c4f6b' }}>
                                <p style={{ margin: 0, fontSize: '12px', fontStyle: 'italic', color: '#2c4f6b' }}>
                                    {data.permitsDetails}
                                </p>
                            </div>
                        )}
                        
                        {item.type === 'selectableList' && (
                            <ul style={{ 
                                margin: 0, 
                                paddingLeft: '25px', 
                                fontSize: '12px',
                                listStyleType: 'disc'
                            }}>
                                {item.items.filter(i => i.selected).map(i => (
                                    <li key={i.id} style={{ 
                                        marginBottom: '5px',
                                        lineHeight: '1.4'
                                    }}>
                                        {i.name}
                                    </li>
                                ))}
                            </ul>
                        )}
                        {(item.type === 'booleanWithText' || item.type === 'textArea') && (
                            <p style={{ margin: 0, fontSize: '12px', whiteSpace: 'pre-wrap' }}>{item.details}</p>
                        )}
                    </div>
                ))}
            </Section>

            {/* Conditional Page Break - only if there's substantial content above */}
            {(safetyLogistics.length > 2 || selectedRiskEntries.length > 0) && <div className="page-break"></div>}

            <Section title="6.0 Equipment">
                <div style={{ fontSize: '12px' }}>
                    <div style={{ marginBottom: '30px' }}>
                        <h4 style={{ margin: '0 0 10px 0', color: '#2c4f6b', fontSize: '14px', fontWeight: 'bold' }}>6.1 Personal Protective Equipment (PPE)</h4>
                        
                        {/* Display PPE details if provided */}
                        {data.ppeDetails && (
                            <div style={{ marginBottom: '10px', padding: '8px', backgroundColor: '#f0fff0', borderLeft: '3px solid #2c4f6b' }}>
                                <p style={{ margin: 0, fontSize: '11px', fontStyle: 'italic', color: '#2c4f6b' }}>
                                    {data.ppeDetails}
                                </p>
                            </div>
                        )}
                        
                        <ul style={{ margin: 0, paddingLeft: '20px', listStyleType: 'disc' }}>
                            {ppe.filter(i => i.selected).map(i => <li key={i.id} style={{ marginBottom: '5px' }}>{i.name}</li>)}
                        </ul>
                    </div>

                    <div style={{ marginBottom: '30px' }}>
                        <h4 style={{ margin: '0 0 10px 0', color: '#2c4f6b', fontSize: '14px', fontWeight: 'bold' }}>6.2 Tools & Equipment</h4>
                        
                        {/* Display Tools details if provided */}
                        {data.toolsDetails && (
                            <div style={{ marginBottom: '10px', padding: '8px', backgroundColor: '#fff8f0', borderLeft: '3px solid #2c4f6b' }}>
                                <p style={{ margin: 0, fontSize: '11px', fontStyle: 'italic', color: '#2c4f6b' }}>
                                    {data.toolsDetails}
                                </p>
                            </div>
                        )}
                        
                        <ul style={{ margin: 0, paddingLeft: '20px', listStyleType: 'disc' }}>
                            {tools.filter(i => i.selected).map(i => <li key={i.id} style={{ marginBottom: '5px' }}>{i.name}</li>)}
                        </ul>
                    </div>

                    <div>
                        <h4 style={{ margin: '0 0 10px 0', color: '#2c4f6b', fontSize: '14px', fontWeight: 'bold' }}>6.3 Materials</h4>
                        
                        {/* Display Materials details if provided */}
                        {data.materialsDetails && (
                            <div style={{ marginBottom: '10px', padding: '8px', backgroundColor: '#faf0ff', borderLeft: '3px solid #2c4f6b' }}>
                                <p style={{ margin: 0, fontSize: '11px', fontStyle: 'italic', color: '#2c4f6b' }}>
                                    {data.materialsDetails}
                                </p>
                            </div>
                        )}
                        
                        <ul style={{ margin: 0, paddingLeft: '20px', listStyleType: 'disc' }}>
                            {materials.filter(i => i.selected).map(i => <li key={i.id} style={{ marginBottom: '5px' }}>{i.name}</li>)}
                        </ul>
                    </div>
                </div>
            </Section>

            {/* Conditional Page Break - only if there are risks to summarize */}
            {/* [SEC 900 END] */}
            {/* [SEC 1000] Section 7: Risk Summary & Analysis */}
            {selectedRiskEntries.length > 0 && <div className="page-break"></div>}

            <Section title="7.0 Risk Summary & Analysis">
                {(() => {
                    // Calculate risk statistics
                    const allHazards = selectedRiskEntries.flatMap(([, category]) => 
                        category.hazards.filter(h => h.selected)
                    );
                    
                    const initialRisks = allHazards.map(h => (h.initialLikelihood || 0) * (h.initialSeverity || 0));
                    const residualRisks = allHazards.map(h => (h.residualLikelihood || 0) * (h.residualSeverity || 0));
                    
                    const riskCounts = {
                        initial: {
                            veryHigh: initialRisks.filter(r => r >= 20).length,
                            high: initialRisks.filter(r => r >= 15 && r < 20).length,
                            medium: initialRisks.filter(r => r >= 8 && r < 15).length,
                            low: initialRisks.filter(r => r >= 3 && r < 8).length,
                            veryLow: initialRisks.filter(r => r >= 1 && r < 3).length
                        },
                        residual: {
                            veryHigh: residualRisks.filter(r => r >= 20).length,
                            high: residualRisks.filter(r => r >= 15 && r < 20).length,
                            medium: residualRisks.filter(r => r >= 8 && r < 15).length,
                            low: residualRisks.filter(r => r >= 3 && r < 8).length,
                            veryLow: residualRisks.filter(r => r >= 1 && r < 3).length
                        }
                    };

                    const highestInitialRisk = Math.max(...initialRisks, 0);
                    const highestResidualRisk = Math.max(...residualRisks, 0);
                    const averageReduction = initialRisks.length > 0 ? 
                        ((initialRisks.reduce((a, b) => a + b, 0) - residualRisks.reduce((a, b) => a + b, 0)) / initialRisks.length).toFixed(1) : 0;

                    return (
                        <div>
                            {/* Risk Statistics Dashboard */}
                            <div style={{ 
                                display: 'grid', 
                                gridTemplateColumns: '1fr 1fr', 
                                gap: '20px', 
                                marginBottom: '30px',
                                padding: '20px',
                                backgroundColor: '#f8f9fa',
                                border: '2px solid #2c4f6b',
                                borderRadius: '8px'
                            }}>
                                <div>
                                    <h4 style={{ color: '#2c4f6b', marginBottom: '15px', textAlign: 'center' }}>Initial Risk Profile</h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', fontSize: '10px' }}>
                                        <div style={{ padding: '6px', backgroundColor: '#ff0000', color: 'white', textAlign: 'center', borderRadius: '4px' }}>
                                            <strong>VERY HIGH: {riskCounts.initial.veryHigh}</strong>
                                        </div>
                                        <div style={{ padding: '6px', backgroundColor: '#ff9900', color: 'black', textAlign: 'center', borderRadius: '4px' }}>
                                            <strong>HIGH: {riskCounts.initial.high}</strong>
                                        </div>
                                        <div style={{ padding: '6px', backgroundColor: '#ffff00', color: 'black', textAlign: 'center', borderRadius: '4px' }}>
                                            <strong>MEDIUM: {riskCounts.initial.medium}</strong>
                                        </div>
                                        <div style={{ padding: '6px', backgroundColor: '#90EE90', color: 'black', textAlign: 'center', borderRadius: '4px' }}>
                                            <strong>LOW: {riskCounts.initial.low}</strong>
                                        </div>
                                        <div style={{ padding: '6px', backgroundColor: '#00ff00', color: 'black', textAlign: 'center', borderRadius: '4px' }}>
                                            <strong>VERY LOW: {riskCounts.initial.veryLow}</strong>
                                        </div>
                                    </div>
                                </div>
                                
                                <div>
                                    <h4 style={{ color: '#2c4f6b', marginBottom: '15px', textAlign: 'center' }}>Residual Risk Profile</h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', fontSize: '10px' }}>
                                        <div style={{ padding: '6px', backgroundColor: '#ff0000', color: 'white', textAlign: 'center', borderRadius: '4px' }}>
                                            <strong>VERY HIGH: {riskCounts.residual.veryHigh}</strong>
                                        </div>
                                        <div style={{ padding: '6px', backgroundColor: '#ff9900', color: 'black', textAlign: 'center', borderRadius: '4px' }}>
                                            <strong>HIGH: {riskCounts.residual.high}</strong>
                                        </div>
                                        <div style={{ padding: '6px', backgroundColor: '#ffff00', color: 'black', textAlign: 'center', borderRadius: '4px' }}>
                                            <strong>MEDIUM: {riskCounts.residual.medium}</strong>
                                        </div>
                                        <div style={{ padding: '6px', backgroundColor: '#90EE90', color: 'black', textAlign: 'center', borderRadius: '4px' }}>
                                            <strong>LOW: {riskCounts.residual.low}</strong>
                                        </div>
                                        <div style={{ padding: '6px', backgroundColor: '#00ff00', color: 'black', textAlign: 'center', borderRadius: '4px' }}>
                                            <strong>VERY LOW: {riskCounts.residual.veryLow}</strong>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Risk Summary Table */}
                            <h4 style={{ color: '#2c4f6b', marginBottom: '15px' }}>Risk Summary Overview</h4>
                            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', marginBottom: '20px' }}>
                                <thead>
                                    <tr>
                                        <th style={{...tableHeaderStyle, width: '30%'}}>Risk Category</th>
                                        <th style={{...tableHeaderStyle, width: '15%'}}>Total Hazards</th>
                                        <th style={{...tableHeaderStyle, width: '15%'}}>Highest Initial</th>
                                        <th style={{...tableHeaderStyle, width: '15%'}}>Highest Residual</th>
                                        <th style={{...tableHeaderStyle, width: '25%'}}>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedRiskEntries.map(([key, category]) => {
                                        const categoryHazards = category.hazards.filter(h => h.selected);
                                        const maxInitial = Math.max(...categoryHazards.map(h => (h.initialLikelihood || 0) * (h.initialSeverity || 0)), 0);
                                        const maxResidual = Math.max(...categoryHazards.map(h => (h.residualLikelihood || 0) * (h.residualSeverity || 0)), 0);
                                        
                                        return (
                                            <tr key={key}>
                                                <td style={cellStyle}>{category.title}</td>
                                                <td style={{...cellStyle, textAlign: 'center'}}>{categoryHazards.length}</td>
                                                <td style={{
                                                    ...cellStyle, 
                                                    textAlign: 'center',
                                                    backgroundColor: getRiskColor(maxInitial),
                                                    color: maxInitial >= 15 ? 'white' : 'black',
                                                    fontWeight: 'bold'
                                                }}>{maxInitial}</td>
                                                <td style={{
                                                    ...cellStyle, 
                                                    textAlign: 'center',
                                                    backgroundColor: getRiskColor(maxResidual),
                                                    color: maxResidual >= 15 ? 'white' : 'black',
                                                    fontWeight: 'bold'
                                                }}>{maxResidual}</td>
                                                <td style={{...cellStyle, textAlign: 'center'}}>
                                                    {maxResidual <= 6 ? '✅ ACCEPTABLE' : maxResidual <= 12 ? '⚠️ MONITOR' : '🚨 REVIEW REQUIRED'}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>

                            {/* Overall Risk Assessment */}
                            <div style={{ 
                                padding: '15px', 
                                backgroundColor: highestResidualRisk <= 6 ? '#d4edda' : highestResidualRisk <= 12 ? '#fff3cd' : '#f8d7da',
                                border: `2px solid ${highestResidualRisk <= 6 ? '#28a745' : highestResidualRisk <= 12 ? '#ffc107' : '#dc3545'}`,
                                borderRadius: '8px',
                                marginBottom: '20px'
                            }}>
                                <h4 style={{ margin: '0 0 10px 0', color: '#2c4f6b' }}>Overall Project Risk Assessment</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', fontSize: '12px' }}>
                                    <div>
                                        <strong>Total Hazards Identified:</strong> {allHazards.length}
                                    </div>
                                    <div>
                                        <strong>Highest Residual Risk:</strong> 
                                        <span style={{ 
                                            marginLeft: '5px',
                                            padding: '2px 6px',
                                            backgroundColor: getRiskColor(highestResidualRisk),
                                            color: highestResidualRisk >= 15 ? 'white' : 'black',
                                            borderRadius: '3px',
                                            fontWeight: 'bold'
                                        }}>{highestResidualRisk}</span>
                                    </div>
                                    <div>
                                        <strong>Average Risk Reduction:</strong> {averageReduction} points
                                    </div>
                                </div>
                                <div style={{ marginTop: '10px', fontSize: '12px', fontWeight: 'bold' }}>
                                    <strong>Project Status:</strong> 
                                    <span style={{ marginLeft: '5px', color: highestResidualRisk <= 6 ? '#28a745' : highestResidualRisk <= 12 ? '#ffc107' : '#dc3545' }}>
                                        {highestResidualRisk <= 6 ? 'APPROVED - Low Risk Project' : 
                                         highestResidualRisk <= 12 ? 'CONDITIONAL APPROVAL - Monitor High Risk Items' : 
                                         'REQUIRES REVIEW - High Risk Project'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })()}
            </Section>

            {/* Conditional Page Break before Approval - only if there's substantial content above */}
            {/* [SEC 1000 END] */}
            {/* [SEC 1100] Section 8: Approval & Sign-Off + print CSS */}
            {(selectedRiskEntries.length > 0 || enabledTasks.length > 2) && <div className="page-break"></div>}

            <Section title="8.0 Approval & Sign-Off">
                {/* Declaration */}
                <div style={{ 
                    padding: '15px', 
                    backgroundColor: '#fff3cd', 
                    border: '2px solid #ffc107', 
                    borderRadius: '5px',
                    marginBottom: '30px'
                }}>
                    <h4 style={{ color: '#2c4f6b', marginBottom: '10px' }}>Declaration</h4>
                    <p style={{ fontSize: '11px', margin: '0 0 10px 0', fontStyle: 'italic' }}>
                        By signing this document, I confirm that:
                    </p>
                    <ul style={{ fontSize: '11px', margin: '0', paddingLeft: '20px' }}>
                        <li>I have read and understood the contents of this Risk Assessment and Method Statement</li>
                        <li>I agree to comply with all specified safety procedures and control measures</li>
                        <li>I will ensure all team members are briefed on the risks and controls identified</li>
                        <li>I will report any changes to risks or working conditions immediately</li>
                        <li>I understand that failure to follow these procedures may result in disciplinary action</li>
                    </ul>
                </div>

                <div style={{ marginTop: '40px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '30px', alignItems: 'start' }}>
                        <div>
                            <div style={signatureNameFieldStyle}>{signatureName || 'Not provided'}</div>
                            <p style={{ margin: '10px 0 0 0', fontSize: '12px', fontWeight: 'bold', textAlign: 'center' }}>Print Name</p>
                        </div>
                        <div>
                            <div style={signatureBoxStyle}>
                                {signatureImageSrc ? (
                                    <img src={signatureImageSrc} alt="Signature" style={{ maxHeight: '70px', maxWidth: '100%' }} />
                                ) : (
                                    <span style={signatureScriptStyle}>{signatureText || 'Signature pending'}</span>
                                )}
                            </div>
                            <p style={{ margin: '10px 0 0 0', fontSize: '12px', fontWeight: 'bold', textAlign: 'center' }}>Signature</p>
                        </div>
                        <div>
                            <div style={signatureNameFieldStyle}>{signatureDate || 'Not provided'}</div>
                            <p style={{ margin: '10px 0 0 0', fontSize: '12px', fontWeight: 'bold', textAlign: 'center' }}>Date</p>
                        </div>
                    </div>
                </div>

                <div style={{ marginTop: '30px', textAlign: 'center', fontSize: '11px', color: '#666' }}>
                    <strong>Position/Role:</strong> {signatureRole}
                </div>
            </Section>

            <style>{`
                @media print {
                    @page {
                        size: A4;
                        margin: 15mm;
                    }
                    body {
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    .page-break {
                        page-break-before: always;
                    }
                    .no-page-break {
                        page-break-inside: avoid;
                    }
                    h1, h2, h3, h4 {
                        page-break-after: avoid;
                    }
                    table {
                        page-break-inside: avoid;
                    }
                    ul, ol {
                        page-break-inside: avoid;
                    }
                    li {
                        page-break-inside: avoid;
                    }
                }
            `}</style>
        </div>
    );
};

export default PrintableDocument;
// [SEC 1100 END]
