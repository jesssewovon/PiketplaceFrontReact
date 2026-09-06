import Swal from 'sweetalert2'

export const showAlert = (
  title: string,
  text: string,
  icon: 'success' | 'error' | 'warning' | 'info' | 'question' = 'info',
  timer: number = 0,
) => {
  return Swal.fire({
    icon,
    title,
    text,
    confirmButtonText: 'OK',
    confirmButtonColor: '#ec11b5',
    ...(timer > 0 ? { timer, timerProgressBar: true, showConfirmButton: false } : {}),
  })
}
