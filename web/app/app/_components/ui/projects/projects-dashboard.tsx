

const projectsDashboard = () => {
    return (
        <div className="flex flex-col h-full animate-in fade-in duration-300">
            <div className="mb-6 flex items-center justify-between border-b border-neutral-100 pb-4 dark:border-neutral-900">
                <h1 className="text-xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
                    Visualizando Projeto
                </h1>
            </div>
            
            {/* Placeholder onde o seu futuro componente será renderizado */}
            <div className="flex flex-1 items-center justify-center rounded-xl border-2 border-dashed border-neutral-200 bg-neutral-50/50 dark:border-neutral-800 dark:bg-neutral-900/20">
                {/* Aqui você pode renderizar o componente do dashboard do projeto */}
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Dashboard do Projeto (em desenvolvimento)
                </p>
            </div>
        </div>
    );
}

export default projectsDashboard;