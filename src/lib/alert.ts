import Swal from 'sweetalert2'

export const showAlert = (
  title: string,
  text: string,
  icon: 'success' | 'error' | 'warning' | 'info' | 'question' = 'info',
  timer: number = 0,
) => {
  void Swal.fire({
    icon,
    title,
    text,
    confirmButtonColor: '#ec11b5',
    ...(timer > 0 ? { timer, timerProgressBar: true, showConfirmButton: false } : {}),
  })
}
