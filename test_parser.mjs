

import { TexParser } from './js/modules/TexParser.js';

const texContent = `
\subsection{Implementation Timeline}

\textbf{Phase 1: Voluntary Market Development (Years 1-3)}
\begin{itemize}
   \item Industry self-regulation and standard development
   \item Government tax incentives for safety insurance
   \item Pilot programs with leading AI companies
\end{itemize}

\textbf{Phase 2: Mandatory Coverage Requirements (Years 3-7)}
\begin{itemize}
   \item Insurance requirements for AI systems above capability thresholds
   \item Government backstop for tail risks
   \item International coordination on standards
\end{itemize}

\textbf{Phase 3: Global Risk Management System (Years 7+)}
\begin{itemize}
   \item International treaty framework
   \item Shared global pool for existential risk
   \item Unified development and deployment standards
\end{itemize}
`;

const parser = new TexParser();
const html = parser.parse(texContent);
console.log(html);

