/**
 * Arquivo JavaScript principal para o Chat App
 */

document.addEventListener('DOMContentLoaded', function () {
    // Inicializar tooltips do Bootstrap
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // Inicializar dropdowns do Bootstrap
    const dropdownElementList = [].slice.call(document.querySelectorAll('.dropdown-toggle'));
    dropdownElementList.map(function (dropdownToggleEl) {
        return new bootstrap.Dropdown(dropdownToggleEl);
    });

    // Função para atualizar status do usuário
    const statusButtons = document.querySelectorAll('.status-btn');
    if (statusButtons) {
        statusButtons.forEach(button => {
            button.addEventListener('click', function () {
                const status = this.dataset.status;

                fetch('/users/status', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ status }),
                })
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            // Atualizar indicador de status na UI
                            document.querySelectorAll('.current-status').forEach(el => {
                                el.classList.remove('text-success', 'text-warning', 'text-secondary');

                                if (status === 'online') {
                                    el.classList.add('text-success');
                                    el.textContent = 'Online';
                                } else if (status === 'away') {
                                    el.classList.add('text-warning');
                                    el.textContent = 'Ausente';
                                } else {
                                    el.classList.add('text-secondary');
                                    el.textContent = 'Offline';
                                }
                            });
                        }
                    })
                    .catch(error => console.error('Erro:', error));
            });
        });
    }

    // Verificar se há novas mensagens a cada 10 segundos
    const checkUnreadInterval = 10000; // 10 segundos

    function checkUnreadMessages() {
        fetch('/messages/unread')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Atualizar contadores de mensagens não lidas
                    const totalUnread = data.totalUnread;

                    // Atualizar contador global (se existir)
                    const globalCounter = document.getElementById('unreadGlobalCounter');
                    if (globalCounter && totalUnread > 0) {
                        globalCounter.textContent = totalUnread;
                        globalCounter.classList.remove('d-none');
                    } else if (globalCounter) {
                        globalCounter.classList.add('d-none');
                    }

                    // Atualizar contadores por chat
                    data.unreadByChat.forEach(chat => {
                        const chatCounter = document.getElementById(`unread-${chat._id}`);
                        if (chatCounter) {
                            chatCounter.textContent = chat.count;
                            chatCounter.classList.remove('d-none');
                        }
                    });
                }
            })
            .catch(error => console.error('Erro ao verificar mensagens não lidas:', error));
    }

    // Iniciar verificação de mensagens não lidas se o usuário estiver logado
    if (document.body.classList.contains('logged-in')) {
        checkUnreadMessages();
        setInterval(checkUnreadMessages, checkUnreadInterval);
    }
}); 