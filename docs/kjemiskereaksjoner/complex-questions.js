// Felles oppgavebank for begge kompleksmodusene.
// Formel og ioner har ASCII-ladning med ^. Bruk [Cu(NH3)4]^2+ i fasit.
window.complexQuestions = [
  {formula:'[Cu(H2O)6]^2+', central:'Cu^2+', ligand:'H2O', coordination:6, ligandName:'vann', explanation:'Vann er en nøytral ligand. Seks vannmolekyler gir koordinasjonstall 6, og kompleksionet beholder Cu²⁺ sin ladning.'},
  {formula:'[Cu(NH3)4]^2+', central:'Cu^2+', ligand:'NH3', coordination:4, ligandName:'ammoniakk', explanation:'NH₃ har ladning 0, så fire ammoniakkligander gir totalt ladning +2.'},
  {formula:'[CuCl4]^2-', central:'Cu^2+', ligand:'Cl^-', coordination:4, ligandName:'klorid', explanation:'Fire Cl⁻ bidrar med −4. Sammen med Cu²⁺ blir totalladningen −2.'},
  {formula:'[Fe(CN)6]^4-', central:'Fe^2+', ligand:'CN^-', coordination:6, ligandName:'cyanid', explanation:'Seks CN⁻ gir −6 og Fe²⁺ gir +2; netto blir −4.'},
  {formula:'[Fe(CN)6]^3-', central:'Fe^3+', ligand:'CN^-', coordination:6, ligandName:'cyanid', explanation:'Seks CN⁻ gir −6 og Fe³⁺ gir +3; netto blir −3.'},
  {formula:'[Ag(CN)2]^-', central:'Ag^+', ligand:'CN^-', coordination:2, ligandName:'cyanid', explanation:'To CN⁻ og ett Ag⁺ gir totalladning −1 og koordinasjonstall 2.'},
  {formula:'[AuCl4]^-', central:'Au^3+', ligand:'Cl^-', coordination:4, ligandName:'klorid', explanation:'Au³⁺ kombinert med fire Cl⁻ gir netto ladning −1.'},
  {formula:'[CoCl4]^2-', central:'Co^2+', ligand:'Cl^-', coordination:4, ligandName:'klorid', explanation:'Co²⁺ og fire Cl⁻ gir nettoladning −2.'},
  {formula:'[Co(H2O)6]^2+', central:'Co^2+', ligand:'H2O', coordination:6, ligandName:'vann', explanation:'H₂O er nøytral; seks ligander rundt Co²⁺ gir koordinasjonstall 6.'},
  {formula:'[AlF6]^3-', central:'Al^3+', ligand:'F^-', coordination:6, ligandName:'fluorid', explanation:'Al³⁺ og seks fluoridioner gir −3 i samlet ladning.'},
  {formula:'[FeSCN]^2+', central:'Fe^3+', ligand:'SCN^-', coordination:1, ligandName:'tiocyanat', explanation:'SCN⁻ binder seg her som én ligand til Fe³⁺. Da blir totalladningen +2 og koordinasjonstallet 1.'},
  {formula:'[Ag(NH3)2]^+', central:'Ag^+', ligand:'NH3', coordination:2, ligandName:'ammoniakk', explanation:'To nøytrale NH₃-ligander binder Ag⁺; totalladningen blir +1.'},
  {formula:'[Zn(NH3)4]^2+', central:'Zn^2+', ligand:'NH3', coordination:4, ligandName:'ammoniakk', explanation:'Fire nøytrale NH₃ rundt Zn²⁺ gir koordinasjonstall 4 og totalladning +2.'},
  {formula:'[Ni(NH3)6]^2+', central:'Ni^2+', ligand:'NH3', coordination:6, ligandName:'ammoniakk', explanation:'Seks ammoniakkligander er nøytrale, slik at komplekset får ladning +2.'},
  {formula:'[Co(NH3)6]^3+', central:'Co^3+', ligand:'NH3', coordination:6, ligandName:'ammoniakk', explanation:'Seks nøytrale ammoniakkligander rundt Co³⁺ gir totalladning +3.'}
];