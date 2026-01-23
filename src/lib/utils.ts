
export const getCategoryColor = (category: string) => {
    const colors = [
        'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200',
        'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200',
        'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200',
        'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200',
        'bg-rose-100 dark:bg-rose-900/30 text-rose-800 dark:text-rose-200',
        'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-200',
        'bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-200',
        'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200',
        'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-800 dark:text-cyan-200',
        'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200',
        'bg-fuchsia-100 dark:bg-fuchsia-900/30 text-fuchsia-800 dark:text-fuchsia-200',
        'bg-pink-100 dark:bg-pink-900/30 text-pink-800 dark:text-pink-200',
    ];

    let hash = 0;
    for (let i = 0; i < category.length; i++) {
        hash = category.charCodeAt(i) + ((hash << 5) - hash);
    }

    const index = Math.abs(hash) % colors.length;
    return colors[index];
};
