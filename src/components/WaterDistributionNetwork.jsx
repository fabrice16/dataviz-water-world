import React, { useState, useEffect, useRef } from 'react';

const WaterDistributionNetwork = () => {
  const [expandedNodes, setExpandedNodes] = useState(new Set());  
  const [hoveredNode, setHoveredNode] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [activeWaterSource, setActiveWaterSource] = useState(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      setZoom(Math.min(Math.max(0.2, zoom * zoomFactor), 4));
    };

    container.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [zoom]);

  const toggleNode = (nodeName) => {
    const newExpanded = new Set(expandedNodes);
    const waterSourceNodes = ['Groundwater', 'Lakes', 'Rivers'];
    
    if (waterSourceNodes.includes(nodeName)) {
      if (newExpanded.has(nodeName)) {
        newExpanded.delete(nodeName);
        if (activeWaterSource === nodeName) {
          setActiveWaterSource(null);
          newExpanded.delete('Used by Humans');
        }
      } else {
        waterSourceNodes.forEach(node => newExpanded.delete(node)); // Clear other water sources
        newExpanded.add(nodeName);
        setActiveWaterSource(nodeName);
        newExpanded.add('Used by Humans');
      }
    }
    else if (nodeName === 'Used by Humans') {
      // Remove the Used by Humans node and its associated water source
      newExpanded.delete('Used by Humans');
      if (activeWaterSource) {
        newExpanded.delete(activeWaterSource);
        setActiveWaterSource(null);
      }
    }
    else {
      if (newExpanded.has(nodeName)) {
        const nodesToRemove = [...newExpanded].filter(node => {
          if (node === nodeName) return true;
          if (nodeName === 'Fresh Water') {
            if (waterSourceNodes.includes(node)) {
              if (node === activeWaterSource) {
                setActiveWaterSource(null);
              }
              return true;
            }
            if (node === 'Used by Humans') return true;
          }
          return false;
        });
        nodesToRemove.forEach(node => newExpanded.delete(node));
      } else {
        newExpanded.add(nodeName);
      }
    }
    
    setExpandedNodes(newExpanded);
  };

  const getNodeSize = (percentage) => {
    if (percentage >= 90) return 240;
    if (percentage >= 60) return 180;
    if (percentage >= 30) return 140;
    if (percentage >= 10) return 100;
    if (percentage >= 1) return 80;
    return 60;
  };

  const createPath = (startX, startY, endX, endY) => {
    const midY = (startY + endY) / 2;
    return `M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY}`;
  };

  const handleMouseDown = (e) => {
    if (e.button === 1 || e.button === 2) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const Node = ({ data, x, y, onClick, isExpanded }) => {
    const size = getNodeSize(data.percentage);
    const isHovered = hoveredNode === data.name;
    
    // Calculate font sizes based on node size
    const getFontSize = () => {
      const baseFontSize = size / 10; // Scale font with node size
      return {
        name: Math.min(Math.max(baseFontSize, 10), 24), // Min 10px, max 24px
        percentage: Math.min(Math.max(baseFontSize * 0.8, 8), 20) // Slightly smaller than name
      };
    };
  
    // Split text into words for better wrapping
    const wrapText = (text) => {
      const words = text.split(' ');
      const lines = [];
      let currentLine = words[0];
  
      // Calculate maximum characters that can fit on one line
      const maxCharsPerLine = Math.floor(size / (getFontSize().name / 1.5));
  
      for (let i = 1; i < words.length; i++) {
        const word = words[i];
        if ((currentLine + ' ' + word).length <= maxCharsPerLine) {
          currentLine += ' ' + word;
        } else {
          lines.push(currentLine);
          currentLine = word;
        }
      }
      lines.push(currentLine);
      return lines;
    };
  
    const fontSizes = getFontSize();
    const textLines = wrapText(data.name);
    const lineHeight = fontSizes.name * 1.2;
    const totalHeight = (textLines.length * lineHeight) + (fontSizes.percentage * 1.5);
    const startY = (size / 2) - (totalHeight / 2);
  
    return (
      <g
        transform={`translate(${x - size/2},${y - size/2})`}
        className="transition-transform duration-300"
        onMouseEnter={() => setHoveredNode(data.name)}
        onMouseLeave={() => setHoveredNode(null)}
      >
        <circle
          cx={size/2}
          cy={size/2}
          r={size/2}
          className={`${data.color} cursor-pointer transition-all duration-300
            ${isHovered ? 'filter brightness-110' : ''}
            ${isExpanded ? 'stroke-blue-500 stroke-2' : data.borderColor || 'stroke-gray-200'}`}
          onClick={() => onClick(data.name)}
        />
        <text
          x={size/2}
          y={size/2}
          textAnchor="middle"
          dominantBaseline="middle"
          className="pointer-events-none"
        >
          {textLines.map((line, index) => (
            <tspan
              key={index}
              x={size/2}
              dy={index === 0 ? startY - size/2 : lineHeight}
              fontSize={fontSizes.name}
            >
              {line}
            </tspan>
          ))}
          <tspan
            x={size/2}
            dy={lineHeight}
            fontSize={fontSizes.percentage}
            className="fill-gray-600"
          >
            {data.percentage}%
          </tspan>
        </text>
      </g>
    );
  };

  const ZoomControls = () => (
    <div className="absolute top-4 right-4 flex gap-2">
      <button
        className="bg-gray-200 px-3 py-1 rounded hover:bg-gray-300"
        onClick={() => setZoom(Math.min(zoom * 1.2, 4))}
      >
        +
      </button>
      <button
        className="bg-gray-200 px-3 py-1 rounded hover:bg-gray-300"
        onClick={() => setZoom(Math.max(zoom * 0.8, 0.2))}
      >
        -
      </button>
      <button
        className="bg-gray-200 px-3 py-1 rounded hover:bg-gray-300"
        onClick={() => {
          setZoom(1);
          setPan({ x: 0, y: 0 });
        }}
      >
        Reset
      </button>
    </div>
  );

  const waterData = {
    name: 'Total Water',
    percentage: 100,
    color: 'fill-purple-200',
    borderColor: 'stroke-purple-400',
    children: [
      {
        name: 'Oceans',
        percentage: 96.5,
        color: 'fill-teal-400'
      },
      {
        name: 'Salt Groundwater',
        percentage: 1,
        color: 'fill-cyan-200'
      },
      {
        name: 'Fresh Water',
        percentage: 2.5,
        color: 'fill-blue-300',
        children: [
          {
            name: 'Ice Caps & Snow',
            percentage: 69,
            color: 'fill-amber-500'
          },
          {
            name: 'Groundwater',
            percentage: 30,
            color: 'fill-blue-400',
            expandToHumanUse: true
          },
          {
            name: 'Lakes',
            percentage: 0.3,
            color: 'fill-blue-400',
            expandToHumanUse: true
          },
          {
            name: 'Rivers',
            percentage: 0.01,
            color: 'fill-blue-400',
            expandToHumanUse: true
          },
          {
            name: 'Ground Ice',
            percentage: 0.9,
            color: 'fill-amber-500'
          },
          {
            name: 'Atmosphere',
            percentage: 0.04,
            color: 'fill-amber-500'
          },
          {
            name: 'Soil',
            percentage: 0.05,
            color: 'fill-amber-500'
          },
          {
            name: 'Swamps',
            percentage: 0.03,
            color: 'fill-amber-500'
          },
          {
            name: 'Organisms',
            percentage: 0.03,
            color: 'fill-green-400',
            children: [
              { name: 'Insects', percentage: 35, color: 'fill-lime-300' },
              { name: 'Fungi', percentage: 23, color: 'fill-lime-300' },
              { name: 'Bacteria', percentage: 22, color: 'fill-lime-300' },
              { name: 'Archaea', percentage: 11, color: 'fill-lime-300' },
              { name: 'Crops', percentage: 2.7, color: 'fill-lime-300' },
              { name: 'Fish', percentage: 2.7, color: 'fill-lime-300' },
              { name: 'Plankton', percentage: 2.3, color: 'fill-lime-300' },
              { name: 'Cattle', percentage: 1, color: 'fill-lime-300' },
              { name: 'Plants', percentage: 1, color: 'fill-lime-300' },
              { name: 'Trees', percentage: 0.6, color: 'fill-lime-300' },
              { name: 'Humans', percentage: 0.3, color: 'fill-lime-300' }
              
            ]
          }
        ]
      }
    ]
  };

  const usedByHumansData = {
    name: 'Used by Humans',
    percentage: 0.03,
    color: 'fill-emerald-400',
    children: [
      { name: 'Agriculture', percentage: 73, color: 'fill-green-300' },
      { name: 'Reservoir Evaporation', percentage: 11, color: 'fill-green-300' },
      { name: 'To Dilute Pollution', percentage: 11, color: 'fill-green-300' },
      { name: 'Industry', percentage: 4, color: 'fill-green-300' },
      { name: 'Urban Use', percentage: 2, color: 'fill-green-300' }
    ]
  };

  const renderNodes = (node, level = 0, x = 600, y = 100) => {
    const isExpanded = expandedNodes.has(node.name);
    const result = [];

    // Only render the Used by Humans node if it's expanded and there's an active water source
    if (node.name === 'Used by Humans' && (!expandedNodes.has('Used by Humans') || !activeWaterSource)) {
      return result;
    }

    result.push(
      <Node
        key={`node-${node.name}`}
        data={node}
        x={x}
        y={y}
        onClick={toggleNode}
        isExpanded={isExpanded}
      />
    );

    if (isExpanded && node.children) {
      const childrenCount = node.children.length;
      const totalWidth = Math.min(2000, childrenCount * 150);
      const spacing = totalWidth / Math.max(1, childrenCount - 1);
      const startX = x - (totalWidth / 2);

      let hasRenderedUsedByHumans = false;

      node.children.forEach((child, index) => {
        const childX = childrenCount === 1 ? x : startX + (spacing * index);
        const childY = y + 200;

        result.push(
          <path
            key={`line-${node.name}-${child.name}`}
            d={createPath(x, y + getNodeSize(node.percentage)/2, childX, childY - getNodeSize(child.percentage)/2)}
            stroke="gray"
            strokeWidth="1"
            fill="none"
            className="transition-all duration-500"
            style={{
              animation: 'drawLine 1s ease forwards',
            }}
          />
        );

        result.push(...renderNodes(child, level + 1, childX, childY));

        // Show connections for all water sources when any is active and Used by Humans is expanded
        if (child.expandToHumanUse && activeWaterSource && expandedNodes.has('Used by Humans')) {
          const usedByHumansX = x;
          const usedByHumansY = childY + 400;

          result.push(
            <path
              key={`connection-${child.name}-used-by-humans`}
              d={createPath(
                childX,
                childY + getNodeSize(child.percentage)/2,
                usedByHumansX,
                usedByHumansY - getNodeSize(usedByHumansData.percentage)/2
              )}
              stroke="gray"
              strokeWidth="1"
              strokeDasharray="5,5"
              fill="none"
              className="transition-all duration-500"
              style={{
                animation: 'drawLine 1s ease forwards',
              }}
            />
          );

          // Only render Used by Humans section once
          if (!hasRenderedUsedByHumans) {
            result.push(...renderNodes(usedByHumansData, level + 2, usedByHumansX, usedByHumansY));
            hasRenderedUsedByHumans = true;
          }
        }
      });
    }

    return result;
  };

  return (
    <div className="p-6 mx-auto relative" style={{ width: '100vw', height: '100vh' }}>
      <h1 className="text-4xl font-bold mb-8 text-center">DataViz Challenge - Water World</h1>
      <div 
        ref={containerRef}
        className="bg-white rounded-lg shadow-lg p-8 overflow-hidden relative"
        style={{ width: '100%', height: 'calc(100% - 100px)' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onContextMenu={(e) => e.preventDefault()}
      >
        <ZoomControls />
        <div className="absolute bottom-4 left-4 bg-white/90 p-4 rounded-lg shadow-lg border border-gray-200">
            <div className="space-y-2 text-sm text-gray-600">
                <p className="font-semibold">Created by: Fabrice Philippe</p>
                <p>Inspiration: David McCandless - Water World Visualization</p>
                <p>Data: geni.us/KIB-WaterWorld</p>
                <p>Source: US Geological Survey, FAQ, Knowledge is Beautiful</p>
            </div>
        </div>
        <svg 
  width="100%" 
  height="100%" 
  viewBox="-400 -100 2400 2000"
  preserveAspectRatio="xMidYMid meet"
>
  <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
    <defs>
      <pattern 
        id="backgroundPattern" 
        patternUnits="userSpaceOnUse" 
        width="2400" 
        height="2000"
      >
      </pattern>
      <style>
        {`
          @keyframes drawLine {
            from { stroke-dashoffset: 1000; }
            to { stroke-dashoffset: 0; }
          }
        `}
      </style>
    </defs>
    {/* Add background rectangle */}
    <rect 
      x="-400" 
      y="-100" 
      width="2400" 
      height="2000" 
      fill="url(#backgroundPattern)"
    />
    {renderNodes(waterData)}
  </g>
</svg>
      </div>
    </div>
  );
};

export default WaterDistributionNetwork