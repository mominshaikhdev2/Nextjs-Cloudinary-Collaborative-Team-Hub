'use client';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import KanbanCard from './KanbanCard';
import { actionItemApi } from '@/lib/api1';
import toast from 'react-hot-toast';

const COLUMNS = [
  { id: 'TODO', label: 'To Do', color: 'bg-zinc-500' },
  { id: 'IN_PROGRESS', label: 'In Progress', color: 'bg-blue-500' },
  { id: 'IN_REVIEW', label: 'In Review', color: 'bg-amber-500' },
  { id: 'DONE', label: 'Done', color: 'bg-emerald-500' },
];

export default function KanbanBoard({ columns, setColumns, workspaceId, onEdit, onDelete, onStatusChange }) {
  const onDragEnd = async (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const srcCol = source.droppableId;
    const dstCol = destination.droppableId;

    const srcItems = Array.from(columns[srcCol]);
    const dstItems = srcCol === dstCol ? srcItems : Array.from(columns[dstCol]);

    const [movedItem] = srcItems.splice(source.index, 1);
    const updatedItem = { ...movedItem, status: dstCol };
    dstItems.splice(destination.index, 0, updatedItem);

    setColumns((prev) => ({
      ...prev,
      [srcCol]: srcCol === dstCol ? dstItems : srcItems,
      [dstCol]: dstItems,
    }));

    try {
      await actionItemApi.update(workspaceId, draggableId, {
        status: dstCol,
        order: destination.index,
      });
    } catch {
      toast.error('Failed to move card');
    }
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
        {COLUMNS.map((col) => (
          <div key={col.id} className="card flex flex-col min-h-[400px]">
            {/* Column header */}
            <div className="flex items-center gap-2 p-4 border-b border-zinc-800">
              <span className={`w-2 h-2 rounded-full ${col.color}`} />
              <span className="font-medium text-sm text-zinc-300">{col.label}</span>
              <span className="ml-auto text-xs text-zinc-600 bg-zinc-800 px-2 py-0.5 rounded-full">
                {columns[col.id]?.length || 0}
              </span>
            </div>

            {/* Droppable area */}
            <Droppable droppableId={col.id}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`flex-1 p-3 space-y-2 transition-colors rounded-b-xl ${
                    snapshot.isDraggingOver ? 'bg-violet-500/5 kanban-drop-target' : ''
                  }`}
                >
                  {columns[col.id]?.map((item, idx) => (
                    <Draggable key={item.id} draggableId={item.id} index={idx}>
                      {(prov, snap) => (
                        <div
                          ref={prov.innerRef}
                          {...prov.draggableProps}
                          {...prov.dragHandleProps}
                          className={snap.isDragging ? 'kanban-dragging' : ''}
                        >
                          <KanbanCard
                            item={item}
                            onEdit={onEdit}
                            onDelete={onDelete}
                          />
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}

                  {columns[col.id]?.length === 0 && !snapshot.isDraggingOver && (
                    <div className="flex items-center justify-center h-24 border-2 border-dashed border-zinc-800 rounded-lg">
                      <span className="text-zinc-700 text-xs">Drop here</span>
                    </div>
                  )}
                </div>
              )}
            </Droppable>
          </div>
        ))}
      </div>
    </DragDropContext>
  );
}