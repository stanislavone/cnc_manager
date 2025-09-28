// CNC Tool Manager Application
class ToolManager {
    constructor() {
        this.tools = [];
        this.currentFilter = 'all';
        this.editingTool = null;
        
        // Initialize the application
        this.init();
    }

    init() {
        // Load tools from localStorage
        this.loadTools();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Render initial view
        this.renderTools();
        
        // Show empty state if no tools
        this.updateEmptyState();
        
        console.log('CNC Tool Manager initialized');
    }

    setupEventListeners() {
        // Add tool buttons
        document.getElementById('addToolBtn').addEventListener('click', () => this.openModal());
        document.getElementById('emptyStateAddBtn').addEventListener('click', () => this.openModal());
        
        // Modal controls
        document.getElementById('closeModal').addEventListener('click', () => this.closeModal());
        document.getElementById('cancelBtn').addEventListener('click', () => this.closeModal());
        
        // Form submission
        document.getElementById('toolForm').addEventListener('submit', (e) => this.handleSubmit(e));
        
        // Search functionality
        document.getElementById('searchInput').addEventListener('input', (e) => this.handleSearch(e.target.value));
        
        // Filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleFilter(e.target.dataset.filter));
        });
        
        // Modal background click to close
        document.getElementById('toolModal').addEventListener('click', (e) => {
            if (e.target.id === 'toolModal') {
                this.closeModal();
            }
        });

        // Confirmation modal
        document.getElementById('confirmCancel').addEventListener('click', () => this.closeConfirmModal());
        
        // ESC key to close modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
                this.closeConfirmModal();
            }
        });
    }

    openModal(tool = null) {
        this.editingTool = tool;
        const modal = document.getElementById('toolModal');
        const form = document.getElementById('toolForm');
        const title = document.getElementById('modalTitle');
        
        // Reset form
        form.reset();
        
        if (tool) {
            // Edit mode
            title.textContent = 'Редактировать инструмент';
            document.getElementById('toolName').value = tool.name;
            document.getElementById('toolType').value = tool.type;
            document.getElementById('machineName').value = tool.machine;
            document.getElementById('toolDiameter').value = tool.diameter || '';
            document.getElementById('toolLength').value = tool.length || '';
            document.getElementById('toolPosition').value = tool.position || '';
            document.getElementById('toolNotes').value = tool.notes || '';
        } else {
            // Add mode
            title.textContent = 'Добавить инструмент';
        }
        
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
        
        // Focus first input
        setTimeout(() => {
            document.getElementById('toolName').focus();
        }, 100);
    }

    closeModal() {
        const modal = document.getElementById('toolModal');
        modal.classList.remove('show');
        document.body.style.overflow = '';
        this.editingTool = null;
    }

    handleSubmit(e) {
        e.preventDefault();
        
        const formData = {
            name: document.getElementById('toolName').value.trim(),
            type: document.getElementById('toolType').value,
            machine: document.getElementById('machineName').value.trim(),
            diameter: document.getElementById('toolDiameter').value,
            length: document.getElementById('toolLength').value,
            position: document.getElementById('toolPosition').value.trim(),
            notes: document.getElementById('toolNotes').value.trim()
        };

        // Validation
        if (!formData.name || !formData.type || !formData.machine) {
            this.showNotification('Пожалуйста, заполните все обязательные поля', 'error');
            return;
        }

        if (this.editingTool) {
            // Update existing tool
            const index = this.tools.findIndex(t => t.id === this.editingTool.id);
            if (index !== -1) {
                this.tools[index] = { ...this.editingTool, ...formData };
                this.showNotification('Инструмент успешно обновлен', 'success');
            }
        } else {
            // Add new tool
            const newTool = {
                id: Date.now().toString(),
                ...formData,
                dateAdded: new Date().toISOString()
            };
            this.tools.push(newTool);
            this.showNotification('Инструмент успешно добавлен', 'success');
        }

        this.saveTools();
        this.renderTools();
        this.updateEmptyState();
        this.closeModal();
    }

    editTool(id) {
        const tool = this.tools.find(t => t.id === id);
        if (tool) {
            this.openModal(tool);
        }
    }

    deleteTool(id) {
        const tool = this.tools.find(t => t.id === id);
        if (tool) {
            this.showConfirmDialog(
                `Вы уверены, что хотите удалить инструмент "${tool.name}"?`,
                () => {
                    this.tools = this.tools.filter(t => t.id !== id);
                    this.saveTools();
                    this.renderTools();
                    this.updateEmptyState();
                    this.showNotification('Инструмент удален', 'success');
                }
            );
        }
    }

    showConfirmDialog(message, onConfirm) {
        const modal = document.getElementById('confirmModal');
        const messageEl = document.getElementById('confirmMessage');
        const confirmBtn = document.getElementById('confirmDelete');
        
        messageEl.textContent = message;
        
        // Remove any existing listeners
        const newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
        
        // Add new listener
        newConfirmBtn.addEventListener('click', () => {
            onConfirm();
            this.closeConfirmModal();
        });
        
        modal.classList.add('show');
    }

    closeConfirmModal() {
        const modal = document.getElementById('confirmModal');
        modal.classList.remove('show');
    }

    handleSearch(searchTerm) {
        this.searchTerm = searchTerm.toLowerCase();
        this.renderTools();
    }

    handleFilter(filter) {
        // Update active filter button
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-filter="${filter}"]`).classList.add('active');
        
        this.currentFilter = filter;
        this.renderTools();
    }

    getFilteredTools() {
        let filtered = [...this.tools];

        // Apply search filter
        if (this.searchTerm) {
            filtered = filtered.filter(tool => 
                tool.name.toLowerCase().includes(this.searchTerm) ||
                tool.machine.toLowerCase().includes(this.searchTerm) ||
                tool.type.toLowerCase().includes(this.searchTerm) ||
                (tool.position && tool.position.toLowerCase().includes(this.searchTerm)) ||
                (tool.notes && tool.notes.toLowerCase().includes(this.searchTerm))
            );
        }

        // Apply type filter
        if (this.currentFilter !== 'all') {
            filtered = filtered.filter(tool => tool.type === this.currentFilter);
        }

        // Sort by machine name, then by position
        filtered.sort((a, b) => {
            if (a.machine !== b.machine) {
                return a.machine.localeCompare(b.machine);
            }
            return (a.position || '').localeCompare(b.position || '');
        });

        return filtered;
    }

    renderTools() {
        const container = document.getElementById('toolsGrid');
        const filteredTools = this.getFilteredTools();

        if (filteredTools.length === 0) {
            container.innerHTML = this.searchTerm || this.currentFilter !== 'all' 
                ? '<div class="no-results">Инструменты не найдены</div>'
                : '';
            return;
        }

        container.innerHTML = filteredTools.map(tool => this.createToolCard(tool)).join('');
    }

    createToolCard(tool) {
        const typeIcon = this.getTypeIcon(tool.type);
        const formattedDate = this.formatDate(tool.dateAdded);

        return `
            <div class="tool-card" data-id="${tool.id}">
                <div class="tool-card-header">
                    <div class="tool-info">
                        <h3>${this.escapeHtml(tool.name)}</h3>
                        <span class="tool-type ${tool.type}">${typeIcon} ${tool.type}</span>
                    </div>
                    <div class="tool-actions">
                        <button class="action-btn edit" onclick="toolManager.editTool('${tool.id}')" title="Редактировать">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete" onclick="toolManager.deleteTool('${tool.id}')" title="Удалить">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="tool-details">
                    <div class="tool-detail">
                        <span class="detail-label">Станок:</span>
                        <span class="detail-value machine-name">${this.escapeHtml(tool.machine)}</span>
                    </div>
                    ${tool.position ? `
                        <div class="tool-detail">
                            <span class="detail-label">Позиция:</span>
                            <span class="detail-value">${this.escapeHtml(tool.position)}</span>
                        </div>
                    ` : ''}
                    ${tool.diameter ? `
                        <div class="tool-detail">
                            <span class="detail-label">Диаметр:</span>
                            <span class="detail-value">${tool.diameter} мм</span>
                        </div>
                    ` : ''}
                    ${tool.length ? `
                        <div class="tool-detail">
                            <span class="detail-label">Длина:</span>
                            <span class="detail-value">${tool.length} мм</span>
                        </div>
                    ` : ''}
                    ${tool.notes ? `
                        <div class="tool-detail">
                            <span class="detail-label">Примечания:</span>
                            <span class="detail-value">${this.escapeHtml(tool.notes)}</span>
                        </div>
                    ` : ''}
                    <div class="tool-detail">
                        <span class="detail-label">Добавлен:</span>
                        <span class="detail-value">${formattedDate}</span>
                    </div>
                </div>
            </div>
        `;
    }

    getTypeIcon(type) {
        const icons = {
            'фреза': '🔧',
            'сверло': '🗲',
            'резьбофреза': '⚙️',
            'другое': '🔨'
        };
        return icons[type] || '🔧';
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    updateEmptyState() {
        const emptyState = document.getElementById('emptyState');
        const toolsGrid = document.getElementById('toolsGrid');
        
        if (this.tools.length === 0) {
            emptyState.style.display = 'block';
            toolsGrid.style.display = 'none';
        } else {
            emptyState.style.display = 'none';
            toolsGrid.style.display = 'grid';
        }
    }

    saveTools() {
        try {
            localStorage.setItem('cncTools', JSON.stringify(this.tools));
        } catch (error) {
            console.error('Ошибка при сохранении данных:', error);
            this.showNotification('Ошибка при сохранении данных', 'error');
        }
    }

    loadTools() {
        try {
            const saved = localStorage.getItem('cncTools');
            if (saved) {
                this.tools = JSON.parse(saved);
            } else {
                // Add demo data for first launch
                this.tools = this.createDemoData();
                this.saveTools();
            }
        } catch (error) {
            console.error('Ошибка при загрузке данных:', error);
            this.tools = this.createDemoData();
        }
    }

    createDemoData() {
        return [
            {
                id: '1',
                name: 'Концевая фреза Ø10',
                type: 'фреза',
                machine: 'Haas VF-2',
                diameter: '10',
                length: '75',
                position: 'T01',
                notes: 'Для обработки алюминия',
                dateAdded: new Date().toISOString()
            },
            {
                id: '2',
                name: 'Спиральное сверло Ø8',
                type: 'сверло',
                machine: 'Haas VF-2',
                diameter: '8',
                length: '120',
                position: 'T02',
                notes: 'HSS-E сверло',
                dateAdded: new Date().toISOString()
            },
            {
                id: '3',
                name: 'Резьбофреза M8',
                type: 'резьбофреза',
                machine: 'DMG Mori NTX',
                diameter: '8',
                length: '80',
                position: 'T15',
                notes: 'Для нарезки резьбы M8x1.25',
                dateAdded: new Date().toISOString()
            }
        ];
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            background: ${type === 'error' ? '#e74c3c' : '#2ecc71'};
            color: white;
            border-radius: 10px;
            box-shadow: 0 5px 25px rgba(0,0,0,0.2);
            z-index: 10000;
            animation: slideInRight 0.3s ease;
            max-width: 300px;
        `;
        
        notification.textContent = message;
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease forwards';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    // Export tools to JSON
    exportTools() {
        const dataStr = JSON.stringify(this.tools, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `cnc-tools-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        this.showNotification('Данные экспортированы', 'success');
    }

    // Import tools from JSON
    importTools(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const imported = JSON.parse(e.target.result);
                if (Array.isArray(imported)) {
                    this.tools = imported;
                    this.saveTools();
                    this.renderTools();
                    this.updateEmptyState();
                    this.showNotification('Данные импортированы', 'success');
                } else {
                    this.showNotification('Неверный формат файла', 'error');
                }
            } catch (error) {
                this.showNotification('Ошибка при чтении файла', 'error');
            }
        };
        reader.readAsText(file);
    }
}

// Add notification animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    .no-results {
        text-align: center;
        padding: 3rem;
        color: #7f8c8d;
        font-size: 1.1rem;
        grid-column: 1 / -1;
    }
`;
document.head.appendChild(style);

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.toolManager = new ToolManager();
});

// Service Worker for PWA functionality (optional)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}
