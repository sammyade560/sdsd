"use client"

import type React from "react"

import { useState, useRef, useCallback, useEffect } from "react"
import {
  Save,
  Play,
  Pause,
  ZoomIn,
  ZoomOut,
  Grid,
  Settings,
  Trash2,
  Copy,
  ArrowLeft,
  Database,
  Globe,
  Mail,
  Webhook,
  Code,
  Filter,
  Clock,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"

// Node types for the workflow
const nodeTypes = [
  {
    id: "trigger",
    name: "Trigger",
    icon: Play,
    color: "bg-green-100 text-green-700 border-green-200",
    description: "Start your workflow",
    category: "triggers",
  },
  {
    id: "http",
    name: "HTTP Request",
    icon: Globe,
    color: "bg-blue-100 text-blue-700 border-blue-200",
    description: "Make API calls",
    category: "actions",
  },
  {
    id: "database",
    name: "Database",
    icon: Database,
    color: "bg-purple-100 text-purple-700 border-purple-200",
    description: "Query or update data",
    category: "actions",
  },
  {
    id: "email",
    name: "Send Email",
    icon: Mail,
    color: "bg-orange-100 text-orange-700 border-orange-200",
    description: "Send notifications",
    category: "actions",
  },
  {
    id: "webhook",
    name: "Webhook",
    icon: Webhook,
    color: "bg-indigo-100 text-indigo-700 border-indigo-200",
    description: "Receive external data",
    category: "triggers",
  },
  {
    id: "code",
    name: "Code",
    icon: Code,
    color: "bg-gray-100 text-gray-700 border-gray-200",
    description: "Custom logic",
    category: "actions",
  },
  {
    id: "filter",
    name: "Filter",
    icon: Filter,
    color: "bg-yellow-100 text-yellow-700 border-yellow-200",
    description: "Conditional logic",
    category: "logic",
  },
  {
    id: "delay",
    name: "Delay",
    icon: Clock,
    color: "bg-pink-100 text-pink-700 border-pink-200",
    description: "Wait before continuing",
    category: "logic",
  },
]

interface WorkflowNode {
  id: string
  type: string
  name: string
  x: number
  y: number
  config: Record<string, any>
  connections: string[]
}

interface Connection {
  from: string
  to: string
}

export default function WorkflowCanvas() {
  const [nodes, setNodes] = useState<WorkflowNode[]>([])
  const [connections, setConnections] = useState<Connection[]>([])
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [draggedNode, setDraggedNode] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [showGrid, setShowGrid] = useState(true)
  const [workflowName, setWorkflowName] = useState("Untitled Workflow")
  const [isRunning, setIsRunning] = useState(false)

  const canvasRef = useRef<HTMLDivElement>(null)
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const updateCanvasSize = () => {
      if (canvasRef.current) {
        setCanvasSize({
          width: canvasRef.current.offsetWidth,
          height: canvasRef.current.offsetHeight,
        })
      }
    }

    updateCanvasSize()
    window.addEventListener("resize", updateCanvasSize)
    return () => window.removeEventListener("resize", updateCanvasSize)
  }, [])

  const handleDragStart = (e: React.DragEvent, nodeType: string) => {
    e.dataTransfer.setData("nodeType", nodeType)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const nodeType = e.dataTransfer.getData("nodeType")
    const rect = canvasRef.current?.getBoundingClientRect()

    if (rect) {
      const x = (e.clientX - rect.left - pan.x) / zoom
      const y = (e.clientY - rect.top - pan.y) / zoom

      const nodeTypeData = nodeTypes.find((nt) => nt.id === nodeType)
      if (nodeTypeData) {
        const newNode: WorkflowNode = {
          id: `node_${Date.now()}`,
          type: nodeType,
          name: nodeTypeData.name,
          x,
          y,
          config: {},
          connections: [],
        }
        setNodes((prev) => [...prev, newNode])
      }
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation()
    const rect = canvasRef.current?.getBoundingClientRect()
    const node = nodes.find((n) => n.id === nodeId)

    if (rect && node) {
      setDraggedNode(nodeId)
      setDragOffset({
        x: (e.clientX - rect.left - pan.x) / zoom - node.x,
        y: (e.clientY - rect.top - pan.y) / zoom - node.y,
      })
      setSelectedNode(nodeId)
    }
  }

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (draggedNode && canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect()
        const x = (e.clientX - rect.left - pan.x) / zoom - dragOffset.x
        const y = (e.clientY - rect.top - pan.y) / zoom - dragOffset.y

        setNodes((prev) => prev.map((node) => (node.id === draggedNode ? { ...node, x, y } : node)))
      }
    },
    [draggedNode, dragOffset, pan, zoom],
  )

  const handleMouseUp = useCallback(() => {
    setDraggedNode(null)
  }, [])

  useEffect(() => {
    if (draggedNode) {
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
      return () => {
        document.removeEventListener("mousemove", handleMouseMove)
        document.removeEventListener("mouseup", handleMouseUp)
      }
    }
  }, [draggedNode, handleMouseMove, handleMouseUp])

  const deleteNode = (nodeId: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== nodeId))
    setConnections((prev) => prev.filter((c) => c.from !== nodeId && c.to !== nodeId))
    if (selectedNode === nodeId) {
      setSelectedNode(null)
    }
  }

  const duplicateNode = (nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId)
    if (node) {
      const newNode: WorkflowNode = {
        ...node,
        id: `node_${Date.now()}`,
        x: node.x + 50,
        y: node.y + 50,
        connections: [],
      }
      setNodes((prev) => [...prev, newNode])
    }
  }

  const runWorkflow = () => {
    setIsRunning(true)
    // Simulate workflow execution
    setTimeout(() => {
      setIsRunning(false)
    }, 3000)
  }

  const selectedNodeData = selectedNode ? nodes.find((n) => n.id === selectedNode) : null
  const selectedNodeType = selectedNodeData ? nodeTypes.find((nt) => nt.id === selectedNodeData.type) : null

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <Link href="/workflows">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <Input
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
              className="text-lg font-semibold border-none bg-transparent p-0 h-auto focus-visible:ring-0"
            />
            <p className="text-sm text-gray-500">Workflow Editor</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowGrid(!showGrid)}>
            <Grid className="w-4 h-4 mr-2" />
            Grid
          </Button>
          <Button variant="outline" size="sm" onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}>
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-sm text-gray-600">{Math.round(zoom * 100)}%</span>
          <Button variant="outline" size="sm" onClick={() => setZoom(Math.min(2, zoom + 0.1))}>
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm">
            <Save className="w-4 h-4 mr-2" />
            Save
          </Button>
          <Button className="bg-green-600 hover:bg-green-700" size="sm" onClick={runWorkflow} disabled={isRunning}>
            {isRunning ? (
              <>
                <Pause className="w-4 h-4 mr-2" />
                Running...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Run
              </>
            )}
          </Button>
        </div>
      </header>

      <div className="flex-1 flex">
        {/* Node Palette */}
        <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
          <div className="p-4">
            <h3 className="font-semibold text-gray-900 mb-4">Workflow Nodes</h3>

            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="triggers">Triggers</TabsTrigger>
                <TabsTrigger value="actions">Actions</TabsTrigger>
                <TabsTrigger value="logic">Logic</TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="space-y-2 mt-4">
                {nodeTypes.map((nodeType) => (
                  <div
                    key={nodeType.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, nodeType.id)}
                    className={`p-3 rounded-lg border-2 border-dashed cursor-move hover:shadow-md transition-shadow ${nodeType.color}`}
                  >
                    <div className="flex items-center gap-3">
                      <nodeType.icon className="w-5 h-5" />
                      <div>
                        <div className="font-medium">{nodeType.name}</div>
                        <div className="text-xs opacity-75">{nodeType.description}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="triggers" className="space-y-2 mt-4">
                {nodeTypes
                  .filter((nt) => nt.category === "triggers")
                  .map((nodeType) => (
                    <div
                      key={nodeType.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, nodeType.id)}
                      className={`p-3 rounded-lg border-2 border-dashed cursor-move hover:shadow-md transition-shadow ${nodeType.color}`}
                    >
                      <div className="flex items-center gap-3">
                        <nodeType.icon className="w-5 h-5" />
                        <div>
                          <div className="font-medium">{nodeType.name}</div>
                          <div className="text-xs opacity-75">{nodeType.description}</div>
                        </div>
                      </div>
                    </div>
                  ))}
              </TabsContent>

              <TabsContent value="actions" className="space-y-2 mt-4">
                {nodeTypes
                  .filter((nt) => nt.category === "actions")
                  .map((nodeType) => (
                    <div
                      key={nodeType.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, nodeType.id)}
                      className={`p-3 rounded-lg border-2 border-dashed cursor-move hover:shadow-md transition-shadow ${nodeType.color}`}
                    >
                      <div className="flex items-center gap-3">
                        <nodeType.icon className="w-5 h-5" />
                        <div>
                          <div className="font-medium">{nodeType.name}</div>
                          <div className="text-xs opacity-75">{nodeType.description}</div>
                        </div>
                      </div>
                    </div>
                  ))}
              </TabsContent>

              <TabsContent value="logic" className="space-y-2 mt-4">
                {nodeTypes
                  .filter((nt) => nt.category === "logic")
                  .map((nodeType) => (
                    <div
                      key={nodeType.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, nodeType.id)}
                      className={`p-3 rounded-lg border-2 border-dashed cursor-move hover:shadow-md transition-shadow ${nodeType.color}`}
                    >
                      <div className="flex items-center gap-3">
                        <nodeType.icon className="w-5 h-5" />
                        <div>
                          <div className="font-medium">{nodeType.name}</div>
                          <div className="text-xs opacity-75">{nodeType.description}</div>
                        </div>
                      </div>
                    </div>
                  ))}
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 relative overflow-hidden">
          <div
            ref={canvasRef}
            className="w-full h-full relative"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            style={{
              backgroundImage: showGrid ? `radial-gradient(circle, #e5e7eb 1px, transparent 1px)` : "none",
              backgroundSize: showGrid ? `${20 * zoom}px ${20 * zoom}px` : "auto",
              backgroundPosition: `${pan.x}px ${pan.y}px`,
            }}
          >
            {/* Canvas Content */}
            <div
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: "0 0",
              }}
              className="absolute inset-0"
            >
              {/* Render Nodes */}
              {nodes.map((node) => {
                const nodeType = nodeTypes.find((nt) => nt.id === node.type)
                if (!nodeType) return null

                return (
                  <div
                    key={node.id}
                    className={`absolute w-48 bg-white rounded-lg border-2 shadow-sm cursor-move select-none ${
                      selectedNode === node.id ? "ring-2 ring-purple-500" : ""
                    } ${nodeType.color.replace("bg-", "border-").replace("text-", "").replace("border-", "border-")}`}
                    style={{
                      left: node.x,
                      top: node.y,
                    }}
                    onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                    onClick={() => setSelectedNode(node.id)}
                  >
                    <div className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <nodeType.icon className="w-4 h-4" />
                          <span className="font-medium text-sm">{node.name}</span>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="w-6 h-6"
                            onClick={(e) => {
                              e.stopPropagation()
                              duplicateNode(node.id)
                            }}
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="w-6 h-6 text-red-600 hover:text-red-700"
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteNode(node.id)
                            }}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>

                      <div className="text-xs text-gray-600 mb-2">{nodeType.description}</div>

                      {isRunning && (
                        <div className="flex items-center gap-2 text-xs">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                          <span className="text-green-600">Running...</span>
                        </div>
                      )}

                      {/* Connection Points */}
                      <div className="absolute -right-2 top-1/2 w-4 h-4 bg-white border-2 border-gray-300 rounded-full transform -translate-y-1/2"></div>
                      <div className="absolute -left-2 top-1/2 w-4 h-4 bg-white border-2 border-gray-300 rounded-full transform -translate-y-1/2"></div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Properties Panel */}
        <div className="w-80 bg-white border-l border-gray-200 overflow-y-auto">
          <div className="p-4">
            {selectedNodeData && selectedNodeType ? (
              <div>
                <h3 className="font-semibold text-gray-900 mb-4">Node Properties</h3>

                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <selectedNodeType.icon className="w-5 h-5" />
                    <div>
                      <div className="font-medium">{selectedNodeType.name}</div>
                      <div className="text-sm text-gray-600">{selectedNodeType.description}</div>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="nodeName">Node Name</Label>
                    <Input
                      id="nodeName"
                      value={selectedNodeData.name}
                      onChange={(e) => {
                        setNodes((prev) =>
                          prev.map((node) => (node.id === selectedNode ? { ...node, name: e.target.value } : node)),
                        )
                      }}
                    />
                  </div>

                  {/* Dynamic configuration based on node type */}
                  {selectedNodeData.type === "http" && (
                    <>
                      <div>
                        <Label htmlFor="httpMethod">Method</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Select method" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="GET">GET</SelectItem>
                            <SelectItem value="POST">POST</SelectItem>
                            <SelectItem value="PUT">PUT</SelectItem>
                            <SelectItem value="DELETE">DELETE</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="httpUrl">URL</Label>
                        <Input id="httpUrl" placeholder="https://api.example.com/endpoint" />
                      </div>
                      <div>
                        <Label htmlFor="httpHeaders">Headers</Label>
                        <Textarea id="httpHeaders" placeholder="Content-Type: application/json" rows={3} />
                      </div>
                    </>
                  )}

                  {selectedNodeData.type === "email" && (
                    <>
                      <div>
                        <Label htmlFor="emailTo">To</Label>
                        <Input id="emailTo" placeholder="recipient@example.com" />
                      </div>
                      <div>
                        <Label htmlFor="emailSubject">Subject</Label>
                        <Input id="emailSubject" placeholder="Email subject" />
                      </div>
                      <div>
                        <Label htmlFor="emailBody">Body</Label>
                        <Textarea id="emailBody" placeholder="Email content..." rows={4} />
                      </div>
                    </>
                  )}

                  {selectedNodeData.type === "database" && (
                    <>
                      <div>
                        <Label htmlFor="dbOperation">Operation</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Select operation" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="SELECT">SELECT</SelectItem>
                            <SelectItem value="INSERT">INSERT</SelectItem>
                            <SelectItem value="UPDATE">UPDATE</SelectItem>
                            <SelectItem value="DELETE">DELETE</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="dbQuery">Query</Label>
                        <Textarea id="dbQuery" placeholder="SELECT * FROM users WHERE..." rows={4} />
                      </div>
                    </>
                  )}

                  {selectedNodeData.type === "delay" && (
                    <div>
                      <Label htmlFor="delayDuration">Duration (seconds)</Label>
                      <Input id="delayDuration" type="number" placeholder="30" />
                    </div>
                  )}

                  <div className="pt-4 border-t">
                    <h4 className="font-medium mb-2">Advanced</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Retry on failure</span>
                        <input type="checkbox" className="rounded" />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Continue on error</span>
                        <input type="checkbox" className="rounded" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Settings className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Node Selected</h3>
                <p className="text-gray-600 text-sm">Select a node from the canvas to view and edit its properties.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
