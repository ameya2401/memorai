import React, { useMemo, useRef, useState, useEffect } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { Website } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { Maximize2, ZoomIn, ZoomOut } from 'lucide-react';

interface KnowledgeGraphProps {
    websites: Website[];
    onNodeClick: (website: Website) => void;
}

interface GraphNode {
    id: string;
    name: string;
    val: number; // size
    color: string;
    type: 'category' | 'website';
    data?: Website;
    x?: number;
    y?: number;
}

interface GraphLink {
    source: string;
    target: string;
}

const KnowledgeGraph: React.FC<KnowledgeGraphProps> = ({ websites, onNodeClick }) => {
    const { isDarkMode } = useTheme();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fgRef = useRef<any>(null);
    const [containerDimensions, setContainerDimensions] = useState({ width: 800, height: 600 });
    const containerRef = useRef<HTMLDivElement>(null);
    const [isReady, setIsReady] = useState(false);

    // Generate consistent color from string
    const stringToColor = (str: string) => {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }

        // Use HSL for better color control
        // Hue: based on hash
        const h = Math.abs(hash % 360);
        // Saturation: 70% for vibrancy
        const s = 70;
        // Lightness: Different for dark/light mode to ensure readability
        const l = isDarkMode ? 60 : 50;

        return `hsl(${h}, ${s}%, ${l}%)`;
    };

    // Transform websites into graph data
    const graphData = useMemo(() => {
        const nodes: GraphNode[] = [];
        const links: GraphLink[] = [];
        const categories = new Set<string>();

        websites.forEach(w => {
            const cat = w.category || 'Uncategorized';
            categories.add(cat);

            // Website Node
            nodes.push({
                id: w.id,
                name: w.title,
                val: 5, // smaller size
                color: isDarkMode ? '#e5e7eb' : '#374151', // light gray or dark gray
                type: 'website',
                data: w
            });
        });

        // Category Hub Nodes
        categories.forEach(cat => {
            nodes.push({
                id: `cat-${cat}`,
                name: cat,
                val: 15, // larger size
                color: stringToColor(cat),
                type: 'category'
            });
        });

        // Links: Website -> Category
        websites.forEach(w => {
            const cat = w.category || 'Uncategorized';
            links.push({
                source: `cat-${cat}`,
                target: w.id
            });
        });

        return { nodes, links };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [websites, isDarkMode]);

    // Handle Resize
    useEffect(() => {
        const updateDimensions = () => {
            if (containerRef.current) {
                setContainerDimensions({
                    width: containerRef.current.clientWidth,
                    height: containerRef.current.clientHeight
                });
            }
        };

        window.addEventListener('resize', updateDimensions);
        updateDimensions();

        // Delay setting ready to ensure container is measured
        const timer = setTimeout(() => setIsReady(true), 100);

        return () => {
            window.removeEventListener('resize', updateDimensions);
            clearTimeout(timer);
        };
    }, []);

    // Handle empty state
    if (websites.length === 0) {
        return (
            <div className={`flex items-center justify-center w-full h-full min-h-[500px] border rounded-lg ${isDarkMode ? 'bg-[#121212] border-[#2e2e2e] text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                <div className="text-center">
                    <p className="text-lg font-medium mb-2">No websites to display</p>
                    <p className="text-sm opacity-70">Add some websites to see the knowledge graph</p>
                </div>
            </div>
        );
    }

    const handleZoomIn = () => {
        fgRef.current?.zoom(fgRef.current.zoom() * 1.2, 400);
    };

    const handleZoomOut = () => {
        fgRef.current?.zoom(fgRef.current.zoom() / 1.2, 400);
    };

    const handleCenter = () => {
        fgRef.current?.zoomToFit(400);
    };

    return (
        <div className="relative w-full h-full min-h-[500px] border rounded-lg overflow-hidden transition-colors duration-300"
            style={{
                borderColor: isDarkMode ? '#2e2e2e' : '#e9e9e9',
                background: isDarkMode ? '#121212' : '#f9fafb'
            }}
            ref={containerRef}
        >
            {isReady && containerDimensions.width > 0 && (
                <ForceGraph2D
                    ref={fgRef}
                    width={containerDimensions.width}
                    height={containerDimensions.height}
                    graphData={graphData}
                    nodeLabel="name"
                    backgroundColor={isDarkMode ? '#121212' : '#f9fafb'}
                    nodeColor="color"
                    linkColor={() => isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}
                    nodeRelSize={4}
                    onNodeClick={(node: GraphNode) => {
                        if (node.type === 'website' && node.data) {
                            onNodeClick(node.data);
                        } else if (node.type === 'category' && typeof node.x === 'number' && typeof node.y === 'number') {
                            // Maybe gather all children or zoom to cluster?
                            fgRef.current?.centerAt(node.x, node.y, 1000);
                            fgRef.current?.zoom(2.5, 1000);
                        }
                    }}
                    cooldownTicks={100}
                    onEngineStop={() => fgRef.current?.zoomToFit(400)}
                    linkDirectionalParticles={isDarkMode ? 2 : 0}
                    linkDirectionalParticleWidth={2}
                    linkDirectionalParticleSpeed={0.005}
                />
            )}

            {/* Controls */}
            <div className="absolute bottom-4 right-4 flex flex-col gap-2">
                <button onClick={handleZoomIn} className={`p-2 rounded-full shadow-lg transition-colors ${isDarkMode ? 'bg-[#1e1e1e] text-white hover:bg-[#2e2e2e]' : 'bg-white text-gray-700 hover:bg-gray-100'}`}>
                    <ZoomIn size={20} />
                </button>
                <button onClick={handleZoomOut} className={`p-2 rounded-full shadow-lg transition-colors ${isDarkMode ? 'bg-[#1e1e1e] text-white hover:bg-[#2e2e2e]' : 'bg-white text-gray-700 hover:bg-gray-100'}`}>
                    <ZoomOut size={20} />
                </button>
                <button onClick={handleCenter} className={`p-2 rounded-full shadow-lg transition-colors ${isDarkMode ? 'bg-[#1e1e1e] text-white hover:bg-[#2e2e2e]' : 'bg-white text-gray-700 hover:bg-gray-100'}`}>
                    <Maximize2 size={20} />
                </button>
            </div>

            <div className={`absolute top-4 left-4 px-3 py-1.5 rounded text-xs font-mono pointer-events-none opacity-60 ${isDarkMode ? 'text-gray-400 bg-black/20' : 'text-gray-500 bg-white/50'}`}>
                {graphData.nodes.length} Nodes • {graphData.links.length} Links
            </div>
        </div>
    );
};

export default KnowledgeGraph;
